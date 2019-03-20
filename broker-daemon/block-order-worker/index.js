const EventEmitter = require('events')
const { promisify } = require('util')

const { BlockOrder, Order, Fill } = require('../models')
const { OrderStateMachine, FillStateMachine } = require('../state-machines')
const {
  Big,
  getRecords,
  SublevelIndex,
  generateId,
  retry
} = require('../utils')

/**
 * Number of attempts to retry a block order when connection with relayer goes down
 * @constant
 * @type {number}
 */
const RETRY_ATTEMPTS = 30

/**
 * Interval, in ms, between retries of re-placing a block order when relayer goes down
 * @constant
 * @type {number}
 */
const DELAY = 10000

/**
 * @class Create and work Block Orders
 */
class BlockOrderWorker extends EventEmitter {
  /**
   * Create a new BlockOrderWorker instance
   *
   * @param {Object} args
   * @param {Map<string, Orderbook>} args.orderbooks - Collection of all active Orderbooks
   * @param {sublevel}               args.store - Sublevel in which to store block orders and child orders
   * @param {Object}                 args.logger
   * @param {RelayerClient}          args.relayer
   * @param {Map<Symbol, Engine>}    args.engines - Collection of all available engines
   * @returns {void}
   */
  constructor ({ orderbooks, store, logger, relayer, engines }) {
    super()

    this.orderbooks = orderbooks
    this.store = store
    this.ordersStore = store.sublevel('orders')
    this.fillsStore = store.sublevel('fills')
    this.logger = logger
    this.relayer = relayer
    this.engines = engines

    const filterOrdersWithHash = (key, value) => !!Order.fromStorage(key, value).swapHash
    const getHashFromOrder = (key, value) => Order.fromStorage(key, value).swapHash

    const filterOrdersWithOrderId = (key, value) => !!Order.fromStorage(key, value).orderId
    const getOrderIdFromOrder = (key, value) => Order.fromStorage(key, value).orderId

    // create an index for the ordersStore so that orders can be retrieved by their swapHash
    this.ordersByHash = new SublevelIndex(
      this.ordersStore,
      'ordersByHash',
      // index by swap hash
      getHashFromOrder,
      // only index orders that have a swap hash defined
      filterOrdersWithHash
    )

    // create an index for the ordersStore so that orders can be retrieved by their orderId
    this.ordersByOrderId = new SublevelIndex(
      this.ordersStore,
      'ordersByOrderId',
      // index by orderId
      getOrderIdFromOrder,
      // only index orders that have an orderId defined
      filterOrdersWithOrderId
    )
  }

  /**
   * Initialize the BlockOrderWorker by clearing and rebuilding the ordersByHash index
   * @returns {void}
   */
  async initialize () {
    await this.ordersByHash.ensureIndex()
    await this.ordersByOrderId.ensureIndex()
    await this.settleIndeterminateOrdersFills()
  }

  /**
   * When the broker goes down, there can be orders and fills in an unresolved state. We should rehydrate the state machines
   * from the database and attempt to trigger them into a resolved state
   * @returns {void}
   */
  async settleIndeterminateOrdersFills () {
    const blockOrders = await getRecords(this.store, BlockOrder.fromStorage.bind(BlockOrder))
    for (let blockOrder of blockOrders) {
      const orderStateMachines = await this.getOrderStateMachines(blockOrder)

      orderStateMachines.filter((osm) => Object.values(OrderStateMachine.INDETERMINATE_STATES).includes(osm.state)).forEach((osm) => {
        this.applyOsmListeners(osm, blockOrder)
        osm.triggerState()
      })

      const fillStateMachines = await this.getFillStateMachines(blockOrder)

      fillStateMachines.filter((fsm) => Object.values(FillStateMachine.INDETERMINATE_STATES).includes(fsm.state)).forEach((fsm) => {
        this.applyFsmListeners(fsm, blockOrder)
        fsm.triggerState()
      })
    }
  }

  /**
   * Given a blockOrder, return associated OrderStateMachines
   * @param {BlockOrder} blockOrder
   * @returns {Array<OrderStateMachine>}
   */
  async getOrderStateMachines (blockOrder) {
    const osms = await getRecords(
      this.ordersStore,
      (key, value) => {
        return OrderStateMachine.fromStore(
          {
            store: this.ordersStore,
            logger: this.logger,
            relayer: this.relayer,
            engines: this.engines
          },
          {
            key,
            value
          }
        )
      },
      // limit the orders we retrieve to those that belong to this blockOrder, i.e. those that are in
      // its prefix range.
      Order.rangeForBlockOrder(blockOrder.id)
    )
    return osms
  }

  /**
   * Given a blockOrder, return associated FillStateMachines
   * @param {BlockOrder} blockOrder
   * @returns {Array<FillStateMachine>}
   */
  async getFillStateMachines (blockOrder) {
    const fsms = await getRecords(
      this.fillsStore,
      (key, value) => {
        return FillStateMachine.fromStore(
          {
            store: this.fillsStore,
            logger: this.logger,
            relayer: this.relayer,
            engines: this.engines
          },
          {
            key,
            value
          }
        )
      },
      // limit the orders we retrieve to those that belong to this blockOrder, i.e. those that are in
      // its prefix range.
      Fill.rangeForBlockOrder(blockOrder.id)
    )

    return fsms
  }

  /**
   * Creates a new block order and registers events for all orders under a block order
   *
   * @param {Object} options
   * @param  {string} options.marketName  - Name of the market to creat the block order in (e.g. BTC/LTC)
   * @param  {string} options.side        - Side of the market to take (e.g. BID or ASK)
   * @param  {string} options.amount      - Amount of base currency (in base units) to transact
   * @param  {string} options.price       - Price at which to transact
   * @param  {string} options.timeInForce - Time restriction (e.g. GTC, FOK)
   * @returns {string}                     ID for the created Block Order
   */
  async createBlockOrder ({ marketName, side, amount, price, timeInForce }) {
    const id = generateId()

    const orderbook = this.orderbooks.get(marketName)

    if (!orderbook) {
      throw new Error(`${marketName} is not being tracked as a market. Configure sparkswapd to track ${marketName} using the MARKETS environment variable.`)
    }

    if (!this.engines.has(orderbook.baseSymbol)) {
      throw new Error(`No engine available for ${orderbook.baseSymbol}.`)
    }

    if (!this.engines.has(orderbook.counterSymbol)) {
      throw new Error(`No engine available for ${orderbook.counterSymbol}.`)
    }

    const blockOrder = new BlockOrder({ id, marketName, side, amount, price, timeInForce })
    await this.checkFundsAreSufficient(blockOrder)

    await promisify(this.store.put)(blockOrder.key, blockOrder.value)

    this.logger.info(`Created and stored block order`, { blockOrderId: blockOrder.id })

    // Start working the block order asynchronously to prevent blocking the creation
    // of 'other' block orders
    this.workBlockOrder(blockOrder, Big(blockOrder.baseAmount)).catch(err => {
      this.failBlockOrder(blockOrder.id, err)
    })

    return id
  }

  /**
   * Checks that there are valid inbound and outbound funds to place/fill the order
   *
   * @param {BlockOrder} blockOrder
   * @returns {void}
   * @throws {Error} If there are insufficient outbound or inbound funds
   */
  async checkFundsAreSufficient (blockOrder) {
    const { marketName, side, outboundSymbol, inboundSymbol } = blockOrder
    const { activeOutboundAmount, activeInboundAmount } = await this.calculateActiveFunds(marketName, side)

    const outboundEngine = this.engines.get(outboundSymbol)
    const inboundEngine = this.engines.get(inboundSymbol)

    if (!outboundEngine) {
      throw new Error(`No engine available for ${outboundSymbol}.`)
    }

    if (!inboundEngine) {
      throw new Error(`No engine available for ${inboundSymbol}.`)
    }
    const [{ address: outboundAddress }, { address: inboundAddress }] = await Promise.all([
      this.relayer.paymentChannelNetworkService.getAddress({ symbol: outboundSymbol }),
      this.relayer.paymentChannelNetworkService.getAddress({ symbol: inboundSymbol })
    ])

    let counterAmount
    let outboundAmount
    let inboundAmount
    // If the blockOrder is a market order we will not have a counterAmount and therefore will not be
    // able to calculate if the funds in channels are sufficient. So we calculate an average price for this.
    if (blockOrder.isMarketOrder) {
      const orderbook = this.orderbooks.get(blockOrder.marketName)

      if (!orderbook) {
        throw new Error(`${blockOrder.marketName} is not being tracked as a market. Configure sparkswapd to track ${blockOrder.marketName} using the MARKETS environment variable.`)
      }
      // averagePrice is the weighted average price of the best orders. This is in common units.
      const averagePrice = await orderbook.getAveragePrice(blockOrder.inverseSide, blockOrder.baseAmount)
      // The counterAmount is calculated by multiplying the price of the order (in our case we have an approximation
      // based on the weighted average of the depth of our order) by the amount of the order. This gets us the common counter amount.
      // We then multiply this by the quantums per common amount for the counter currency to get the counterAmount in units of the counter currency.
      counterAmount = averagePrice.times(blockOrder.amount).times(blockOrder.counterCurrencyConfig.quantumsPerCommon).round(0).toString()
      if (blockOrder.isBid) {
        outboundAmount = counterAmount
        inboundAmount = blockOrder.baseAmount
      } else {
        outboundAmount = blockOrder.baseAmount
        inboundAmount = counterAmount
      }
    } else {
      outboundAmount = blockOrder.outboundAmount
      inboundAmount = blockOrder.inboundAmount
    }

    const outboundBalanceIsSufficient = await outboundEngine.isBalanceSufficient(outboundAddress, Big(outboundAmount).plus(activeOutboundAmount))

    // If the user tries to place an order for more than they hold in the counter engine channel, throw an error
    if (!outboundBalanceIsSufficient) {
      throw new Error(`Insufficient funds in outbound ${blockOrder.outboundSymbol} channel to create order`)
    }

    const inboundBalanceIsSufficient = await inboundEngine.isBalanceSufficient(inboundAddress, Big(inboundAmount).plus(activeInboundAmount), { outbound: false })
    // If the user tries to place an order and the relayer does not have the funds to complete in the base channel, throw an error
    if (!inboundBalanceIsSufficient) {
      throw new Error(`Insufficient funds in inbound ${blockOrder.inboundSymbol} channel to create order`)
    }
  }

  /**
   * Adds up active/committed funds in inbound and outbound orders/fills
   *
   * @param {string} marketName  - Name of the market to creat the block order in (e.g. BTC/LTC)
   * @param {string} side        - Side of the market to take (e.g. BID or ASK)
   * @returns {Object} contains activeOutboundAmount and activeInboundAmount of orders/fills
   */
  async calculateActiveFunds (marketName, side) {
    const blockOrders = await this.getBlockOrders(marketName)

    const blockOrdersForSide = blockOrders.filter(blockOrder => blockOrder.side === side)
    let activeOutboundAmount = Big(0)
    let activeInboundAmount = Big(0)
    for (let blockOrder of blockOrdersForSide) {
      await blockOrder.populateOrders(this.ordersStore)
      await blockOrder.populateFills(this.fillsStore)
      activeOutboundAmount = activeOutboundAmount.plus(blockOrder.activeOutboundAmount())
      activeInboundAmount = activeInboundAmount.plus(blockOrder.activeInboundAmount())
    }

    return { activeOutboundAmount, activeInboundAmount }
  }

  /**
   * Get an existing block order
   * @param {string} blockOrderId - ID of the block order
   * @returns {BlockOrder}
   */
  async getBlockOrder (blockOrderId) {
    this.logger.info('Getting block order', { id: blockOrderId })

    const blockOrder = await BlockOrder.fromStore(this.store, blockOrderId)

    await Promise.all([
      blockOrder.populateOrders(this.ordersStore),
      blockOrder.populateFills(this.fillsStore)
    ])
    return blockOrder
  }

  /**
   * Cancels all outstanding orders for the given block order
   * @param {BlockOrder} blockOrder
   * @returns {void}
   */
  async cancelOutstandingOrders (blockOrder) {
    await blockOrder.populateOrders(this.ordersStore)

    this.logger.info(`Found ${blockOrder.orders.length} orders associated with Block Order ${blockOrder.id}`)

    const openOrders = blockOrder.openOrders

    this.logger.info(`Found ${openOrders.length} orders in a state to be cancelled for Block order ${blockOrder.id}`)

    await Promise.all(openOrders.map(({ order }) => {
      const orderId = order.orderId
      const authorization = this.relayer.identity.authorize()
      return this.relayer.makerService.cancelOrder({ orderId }, authorization)
    }))

    this.logger.info(`Cancelled ${openOrders.length} underlying orders for ${blockOrder.id}`)
  }

  /**
   * Cancel a block order in progress
   * @param {string} blockOrderId - Id of the block order to cancel
   * @returns {BlockOrder}          Block order that was cancelled
   */
  async cancelBlockOrder (blockOrderId) {
    this.logger.info('Cancelling block order ', { id: blockOrderId })

    const blockOrder = await BlockOrder.fromStore(this.store, blockOrderId)

    try {
      await this.cancelOutstandingOrders(blockOrder)
    } catch (e) {
      this.logger.error('Failed to cancel all orders for block order: ', { blockOrderId: blockOrder.id, error: e })
      blockOrder.fail()
      await promisify(this.store.put)(blockOrder.key, blockOrder.value)
      throw e
    }

    blockOrder.cancel()
    await promisify(this.store.put)(blockOrder.key, blockOrder.value)

    this.logger.info('Moved block order to cancelled state', { id: blockOrder.id })

    return blockOrder
  }

  /**
   * Cancel all active orders for a given market
   * @param {string} market - to cancel orders on
   * @returns {Object} result
   * @returns {Array<string>} result.cancelledOrders ids of block orders that have been cancelled
   * @returns {Array<string>} result.failedToCancelOrders ids of block orders that failed to be cancelled
   */
  async cancelActiveOrders (market) {
    this.logger.info('Cancelling all active orders for market', { market })

    const blockOrders = await this.getBlockOrders(market)
    const activeBlockOrders = blockOrders.filter(blockOrder => blockOrder.isActive)
    const cancelledOrders = []
    const failedToCancelOrders = []

    await Promise.all(
      activeBlockOrders.map(async (blockOrder) => {
        try {
          await this.cancelBlockOrder(blockOrder.id)
          cancelledOrders.push(blockOrder.id)
        } catch (e) {
          this.logger.error('Failed to cancel block order', { blockOrderId: blockOrder.id, error: e })
          failedToCancelOrders.push(blockOrder.id)
        }
      })
    )

    this.logger.info(`Successfully cancelled ${cancelledOrders.length} orders, failed to cancel ${failedToCancelOrders.length}.`)
    return { cancelledOrders, failedToCancelOrders }
  }

  /**
   * Get existing block orders
   * @param {string} market - to filter by
   * @returns {Array<BlockOrder>}
   */
  async getBlockOrders (market) {
    this.logger.info(`Getting all block orders for market: ${market}`)
    const allRecords = await getRecords(this.store, BlockOrder.fromStorage.bind(BlockOrder))
    const recordsForMarket = allRecords.filter((record) => record.marketName === market)
    return recordsForMarket
  }

  /**
   * Move a block order to a failed state
   * @param {string} blockOrderId - ID of the block order to be failed
   * @param {Error}  err          - Error that caused the failure
   * @returns {void}
   */
  async failBlockOrder (blockOrderId, err) {
    this.logger.error('Error encountered while working block', { id: blockOrderId, error: err.stack })
    this.logger.info('Moving block order to failed state', { id: blockOrderId })

    // TODO: move status to its own sublevel so it can be updated atomically
    const blockOrder = await BlockOrder.fromStore(this.store, blockOrderId)

    try {
      await this.cancelOutstandingOrders(blockOrder)
    } catch (e) {
      this.logger.error('Failed to cancel all orders for block order: ', { blockOrderId: blockOrder.id, error: e })
    }

    blockOrder.fail()

    await promisify(this.store.put)(blockOrder.key, blockOrder.value)

    this.logger.info('Moved block order to failed state', { id: blockOrderId })
  }

  /**
   * work a block order that gets created
   * @param  {string} blockOrderId - ID of block order to work
   * @param  {Big}    targetDepth  - Depth, in base currency, to reach with this work
   * @returns {void}
   */
  async workBlockOrder ({ id: blockOrderId }, targetDepth) {
    this.logger.info('Working block order', { blockOrderId })

    // Get the existing order in case an update to order status happened between calls to workBlockOrder
    const blockOrder = await this.getBlockOrder(blockOrderId)

    if (!blockOrder.isInWorkableState) {
      this.logger.info('BlockOrder is not in a state to be worked', { blockOrderId: blockOrder.id })
      return
    }

    const orderbook = this.orderbooks.get(blockOrder.marketName)

    if (!orderbook) {
      throw new Error(`No orderbook is initialized for created order in the ${blockOrder.marketName} market.`)
    }

    if (blockOrder.isMarketOrder) {
      // block orders without prices are Market orders and take the best available price
      await this.workMarketBlockOrder(blockOrder, targetDepth)
    } else {
      await this.workLimitBlockOrder(blockOrder, targetDepth)
    }
  }

  /**
   * Work market block order
   * @param {BlockOrder} blockOrder  - BlockOrder without a limit price, i.e. a market order
   * @param {Big}        targetDepth - Depth, in base currency, to reach with this work
   * @returns {void}
   */
  async workMarketBlockOrder (blockOrder, targetDepth) {
    const orderbook = this.orderbooks.get(blockOrder.marketName)

    const { orders, depth } = await orderbook.getBestOrders({ side: blockOrder.inverseSide, depth: targetDepth.toString() })

    if (Big(depth).lt(targetDepth)) {
      this.logger.error(`Insufficient depth in ${blockOrder.inverseSide} to fill ${targetDepth.toString()}`, { depth, targetDepth })
      throw new Error(`Insufficient depth in ${blockOrder.inverseSide} to fill ${targetDepth.toString()}`)
    }

    return this._fillOrders(blockOrder, orders, targetDepth.toString())
  }

  /**
   * Work limit block order
   * @todo make limit orders more sophisticated than just sending a single limit order to the relayer
   * @param {BlockOrder} blockOrder  - BlockOrder with a limit price
   * @param {Big}        targetDepth - Depth, in base currency, to reach with this work
   * @returns {void}
   */
  async workLimitBlockOrder (blockOrder, targetDepth) {
    if (blockOrder.timeInForce !== BlockOrder.TIME_RESTRICTIONS.GTC) {
      throw new Error('Only Good-til-cancelled limit orders are currently supported.')
    }

    const orderbook = this.orderbooks.get(blockOrder.marketName)

    // fill as many orders at our price or better
    const { orders, depth: availableDepth } = await orderbook.getBestOrders({ side: blockOrder.inverseSide, depth: targetDepth.toString(), quantumPrice: blockOrder.quantumPrice })
    await this._fillOrders(blockOrder, orders, targetDepth.toString())

    if (targetDepth.gt(availableDepth)) {
      // place an order for the remaining depth that we could not fill
      this._placeOrders(blockOrder, targetDepth.minus(availableDepth).toString())
    }
  }

  /**
   * Move a block order to a completed state if all orders have been completed
   * @todo What should we do if this method fails, but the order itself is completed?
   * @param {string} blockOrderId
   */
  async checkBlockOrderCompletion (blockOrderId) {
    this.logger.info('Attempting to put block order in a completed state', { id: blockOrderId })

    const blockOrder = await this.getBlockOrder(blockOrderId)

    // check the fillAmount on each collection of state machines from the block order
    // and make sure that either is equal to how much we are trying to fill.
    let totalFilled = Big(0)
    totalFilled = blockOrder.fills.reduce((acc, fsm) => acc.plus(fsm.fill.fillAmount), totalFilled)
    totalFilled = blockOrder.orders.reduce((acc, osm) => {
      // If the order has not been filled yet, then the `fillAmount` will be undefined
      // so we instead default to 0
      return acc.plus(osm.order.fillAmount || 0)
    }, totalFilled)

    this.logger.debug('Current total filled amount: ', { totalFilled, blockOrderAmount: blockOrder.baseAmount })

    const stillBeingFilled = totalFilled.lt(blockOrder.baseAmount)

    // An order is only completed if all orders underneath the blockorder are out of
    // an `ACTIVE` state and it is entirely filled, however we only check if the order is
    // filled here.
    // TODO: check to make sure that blockorder is not in a weird state before completing
    if (!stillBeingFilled) {
      blockOrder.complete()
      await promisify(this.store.put)(blockOrder.key, blockOrder.value)
      this.logger.info('Moved block order to completed state', { blockOrderId })
    } else {
      this.logger.debug('Block order is not ready to be completed', { blockOrderId })
    }
  }

  /**
   * Applies listeners to a created OrderStateMachine
   * @private
   * @param {OrderStateMachine} osm        - State machine to apply listeners to
   * @param {BlockOrder} blockOrder - Block Order associated with the state machine
   * @returns {OrderStateMachine}
   */
  applyOsmListeners (osm, blockOrder) {
    // Try to complete the entire block order once an underlying order completes
    osm.once('complete', async () => {
      osm.removeAllListeners()
      try {
        await this.checkBlockOrderCompletion(blockOrder.id)
      } catch (e) {
        this.logger.error(`BlockOrder failed to be completed from order`, { id: blockOrder.id, error: e.stack })
      }
    })

    // if the fill for this order isn't for the entire order, re-place the remainder
    osm.once('before:execute', async () => {
      this.logger.debug(`Order ${osm.order.orderId} has been filled, re-placing the remainder`)
      try {
        const remainingBaseAmount = Big(osm.order.baseAmount).minus(osm.order.fillAmount)
        // if there is no remaining base amount (i.e. the entire order was filled)
        // take no action as the block order completion is handled in the `on('complete')` listener
        if (remainingBaseAmount.gt(0)) {
          this.logger.debug(`Re-placing an order for ${remainingBaseAmount.toString()} for Block Order ${blockOrder.id}`)
          await this.workBlockOrder(blockOrder, remainingBaseAmount)
        }
      } catch (e) {
        this.failBlockOrder(blockOrder.id, e)
      }
    })

    // try to re-place the block order if the relayer drops connection, while allowing the broker to
    // update block order status (i.e. broker can still cancel orders if relayer goes down)
    osm.once('reject', async () => {
      osm.removeAllListeners()
      if (osm.shouldRetry()) {
        const retryBlockOrder = async () => {
          if (!await this.relayerIsAvailable()) {
            throw new Error('Relayer not available')
          }

          this.logger.info('Retrying order for block order', { order: osm.order.orderId })

          await this.workBlockOrder(blockOrder, Big(osm.order.baseAmount))
        }

        // This will try to rework each order within a block order every 10 seconds for 5 minutes
        // We return the retry function so we can fail the block order if the retry logic fails
        try {
          return retry(retryBlockOrder, `Error reworking block order: ${blockOrder.id}`, RETRY_ATTEMPTS, DELAY)
        } catch (e) {
          // If retry has failed, we log and fall through to fail the block order below
          this.logger.error('Failed retrying block order. Attempting to change order status to failed.', { blockOrder: blockOrder.id, order: osm.order.orderId })
        }
      }

      // This handles failing block orders if retrying has failed or the osm shouldn't retry
      try {
        await this.failBlockOrder(blockOrder.id, osm.order.error)
      } catch (e) {
        this.logger.error(`BlockOrder failed on setting a failed status from order`, { id: blockOrder.id, error: e.stack })
      }
    })

    // remove listeners if the osm is cancelled, should not affect block order status
    osm.once('cancel', async () => {
      osm.removeAllListeners()
    })

    return osm
  }

  /**
   * Place orders for a block order for a given amount, breaking them up based on the maximum order size
   * @param  {BlockOrder} blockOrder - Block Order to place orders on behalf of
   * @param  {string}     baseAmount - Int64 amount, in the base currency's base units, to place orders for
   * @returns {void}
   */
  _placeOrders (blockOrder, baseAmount) {
    const { baseSymbol, counterSymbol, quantumPrice } = blockOrder
    const baseEngine = this.engines.get(baseSymbol)
    const counterEngine = this.engines.get(counterSymbol)

    if (!baseEngine) {
      throw new Error(`No engine available for ${baseSymbol}`)
    }
    if (!counterEngine) {
      throw new Error(`No engine available for ${counterSymbol}`)
    }

    const baseMaxPayment = baseEngine.maxPaymentSize
    const counterMaxPayment = counterEngine.maxPaymentSize

    // our max payment size settings have an implied price. We need to compare that to our actual price
    // to see which max payment size we're going to run up against.
    const maxPaymentSizeImpliedPrice = Big(counterMaxPayment).div(baseMaxPayment)
    let maxBaseAmountPerOrder

    // quantum price is the counter/base (both in quantum units)
    if (Big(quantumPrice).gte(maxPaymentSizeImpliedPrice)) {
      // counter for the block order is larger than base (relative to their max payment sizes)
      maxBaseAmountPerOrder = Big(counterMaxPayment).div(quantumPrice).round(0)
    } else {
      // base for the block order is larger than counter (relative to their max payment sizes)
      maxBaseAmountPerOrder = Big(baseMaxPayment)
    }

    let baseAmountRemaining = Big(baseAmount)
    let orderCount = 1

    // split our larger block order into individual placed orders that are each under
    // the max payment size
    while (baseAmountRemaining.gt(0)) {
      this.logger.info(`Placing order #${orderCount++} for BlockOrder`, { blockOrderId: blockOrder.id })

      let orderBaseAmount = baseAmountRemaining

      if (orderBaseAmount.gte(maxBaseAmountPerOrder)) {
        orderBaseAmount = maxBaseAmountPerOrder
      }

      this._placeOrder(blockOrder, orderBaseAmount.toString())

      baseAmountRemaining = baseAmountRemaining.minus(orderBaseAmount)
    }
  }

  /**
   * Place an order for a block order of a given amount
   * @param  {BlockOrder} blockOrder - Block Order to place an order on behalf of
   * @param  {string} baseAmount     - Int64 amount, in base currency's base units to place the order for
   * @returns {void}
   */
  async _placeOrder (blockOrder, baseAmount) {
    // order params
    const { baseSymbol, counterSymbol, side, quantumPrice } = blockOrder
    const counterAmount = Big(baseAmount).times(quantumPrice).round(0).toString()

    // state machine params
    const { relayer, engines, logger } = this
    const store = this.ordersStore

    this.logger.info('Creating order for BlockOrder', { baseAmount, side, blockOrderId: blockOrder.id })

    const osm = await OrderStateMachine.create(
      {
        relayer,
        engines,
        logger,
        store
      },
      blockOrder.id,
      { side, baseSymbol, counterSymbol, baseAmount, counterAmount }
    )

    this.applyOsmListeners(osm, blockOrder)

    this.logger.info('Created order for BlockOrder', { blockOrderId: blockOrder.id, orderId: osm.order.orderId })
  }

  /**
   * Fill given orders for a given block order up to a target depth
   * @param {BlockOrder}              blockOrder  - BlockOrder that the orders are being filled on behalf of
   * @param {Array<MarketEventOrder>} orders      - Orders to be filled
   * @param {string}                  targetDepth - Int64 string of the maximum depth to fill
   * @returns {Promise<Array<FillStateMachine>>}    Promise that resolves the array of Fill State Machines for these fills
   */
  async _fillOrders (blockOrder, orders, targetDepth) {
    this.logger.info(`Filling ${orders.length} orders for ${blockOrder.id} up to depth of ${targetDepth}`)

    targetDepth = Big(targetDepth)
    let currentDepth = Big('0')

    // state machine params
    const { relayer, engines, logger } = this
    const store = this.fillsStore

    const { baseSymbol, counterSymbol } = blockOrder
    if (!engines.has(baseSymbol)) {
      throw new Error(`No engine available for ${baseSymbol}`)
    }

    if (!engines.has(counterSymbol)) {
      throw new Error(`No engine available for ${counterSymbol}`)
    }

    // These are the orders from the orders store where the orders being passed are actually market event orders
    const ordersFromStore = await Promise.all(orders.map((order) => {
      const range = {
        gte: order.orderId,
        lte: order.orderId
      }
      return getRecords(this.ordersByOrderId, Order.fromStorage.bind(Order), this.ordersByOrderId.range(range))
    }))

    const ownOrderIds = ordersFromStore.filter(matchedOrders => matchedOrders && matchedOrders.length > 0).map(([order]) => order.orderId)

    const promisedFills = orders.map((order) => {
      const depthRemaining = targetDepth.minus(currentDepth)

      // if we have already reached our target depth, create no further fills
      if (depthRemaining.lte(0)) {
        return
      }

      if (ownOrderIds.includes(order.orderId)) {
        throw new Error(`Cannot fill own order ${order.orderId}`)
      }

      // Take the smaller of the remaining desired depth or the base amount of the order
      const fillAmount = depthRemaining.gt(order.baseAmount) ? order.baseAmount : depthRemaining.toString()

      // track our current depth so we know what to fill on the next order
      currentDepth = currentDepth.plus(fillAmount)

      const fsm = FillStateMachine.create(
        {
          relayer,
          engines,
          logger,
          store
        },
        blockOrder.id,
        order,
        { fillAmount }
      ).then((fsm) => {
        this.applyFsmListeners(fsm, blockOrder)
      })

      return fsm
    })
    // filter out null values, they are orders we decided not to fill
    return Promise.all(promisedFills.filter(promise => promise))
  }

  /**
   * Applies listeners to the fill state machine
   * @param {FillStateMachine} fsm - state machine to apply the listeners to
   * @param {BlockOrder} blockOrder  - BlockOrder that the orders are being filled on behalf of
   * @returns {void}
   */
  applyFsmListeners (fsm, blockOrder) {
    // We are hooking into the execute lifecycle event of a fill state machine to trigger
    // the completion of a blockorder
    fsm.once('execute', () => {
      this.checkBlockOrderCompletion(blockOrder.id)
        .catch(e => {
          this.logger.error(`BlockOrder failed to be completed from fill`, { id: blockOrder.id, error: e.stack })
        })
        .then(() => fsm.removeAllListeners())
    })

    /**
     * We are hooking into the reject lifecycle event of a fill state machine to trigger the failure of a blockorder.
     * If the error comes back with an ORDER_NOT_PLACED, it means that the order the fillStateMachine
     * attempted to fill was not in a state to be filled and we should rework the blockOrder
     */
    fsm.once('reject', () => {
      fsm.removeAllListeners()
      if (fsm.shouldRetry()) {
        this.logger.info('Reworking block order due to relayer error')
        this.workBlockOrder(blockOrder, Big(fsm.fill.fillAmount))
      } else {
        this.failBlockOrder(blockOrder.id, fsm.fill.error).catch(e => {
          this.logger.error(`BlockOrder failed on setting a failed status from fill`, { id: blockOrder.id, error: e.stack })
        })
      }
    })

    // remove listeners if the fsm is cancelled, should not affect block order status
    fsm.once('cancel', async () => {
      fsm.removeAllListeners()
    })
  }

  /**
   * Checks if the relayer is available by pinging the healthCheck endpoint. If available,
   * returns true. False otherwise.
   * @private
   * @returns {Promise<boolean>}
   */
  async relayerIsAvailable () {
    try {
      await this.relayer.adminService.healthCheck({})
      return true
    } catch (e) {
      return false
    }
  }
}

module.exports = BlockOrderWorker
