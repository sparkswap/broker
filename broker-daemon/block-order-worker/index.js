const EventEmitter = require('events')
const { promisify } = require('util')
const safeid = require('generate-safe-id')

const { BlockOrder, Order, Fill } = require('../models')
const { OrderStateMachine, FillStateMachine } = require('../state-machines')
const {
  Big,
  getRecords,
  SublevelIndex
} = require('../utils')

const { BlockOrderNotFoundError } = require('./errors')

/**
 * @constant
 * @type {Object}
 * @default
 */
const WORKER_EVENTS = Object.freeze({
  CREATE: 'CREATE',
  REJECTED: 'REJECTED'
})

/**
 * @param {String} event type
 * @param {String} block order id
 * @returns {String} event id
 */
function generateIdforEvent (eventType, blockOrderId) {
  return `${eventType}-${blockOrderId}`
}
/**
 * @class Create and work Block Orders
 */
class BlockOrderWorker extends EventEmitter {
  /**
   * Create a new BlockOrderWorker instance
   *
   * @param  {Map<String, Orderbook>} options.orderbooks Collection of all active Orderbooks
   * @param  {sublevel}               options.store      Sublevel in which to store block orders and child orders
   * @param  {Object}                 options.logger
   * @param  {RelayerClient}          options.relayer
   * @param  {Map<String, Engine>}    options.engines    Collection of all available engines
   * @return {BlockOrderWorker}
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

    // create an index for the ordersStore so that orders can be retrieved by their swapHash
    this.ordersByHash = new SublevelIndex(
      this.ordersStore,
      'ordersByHash',
      // index by swap hash
      getHashFromOrder,
      // only index orders that have a swap hash defined
      filterOrdersWithHash
    )
  }

  /**
   * Initialize the BlockOrderWorker by clearing and rebuilding the ordersByHash index
   * @return {Promise}
   */
  async initialize () {
    await this.ordersByHash.ensureIndex()
  }

  /**
   * Creates a new block order and registers events for all orders under a block order
   *
   * @param {Object} options
   * @param  {String} options.marketName  Name of the market to creat the block order in (e.g. BTC/LTC)
   * @param  {String} options.side        Side of the market to take (e.g. BID or ASK)
   * @param  {String} options.amount      Amount of base currency (in base units) to transact
   * @param  {String} options.price       Price at which to transact
   * @param  {String} options.timeInForce Time restriction (e.g. GTC, FOK)
   * @return {String}                     ID for the created Block Order
   */
  async createBlockOrder ({ marketName, side, amount, price, timeInForce }) {
    const id = safeid()

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

    await promisify(this.store.put)(blockOrder.key, blockOrder.value)

    this.logger.info(`Created and stored block order`, { blockOrderId: blockOrder.id })

    // Register events for a block order
    const createEventId = generateIdforEvent(WORKER_EVENTS.CREATE, id)
    const rejectedEventId = generateIdforEvent(WORKER_EVENTS.REJECTED, id)

    // Start working the block order in another process to prevent blocking the creation
    // of 'other' block orders
    this.on(createEventId, async (blockOrder) => {
      // TODO: figure out a way to reject the blockorder here
      await this.workBlockOrder(blockOrder).catch(e => {
        this.emit(rejectedEventId, blockOrder.id, e)
      })
    })

    this.on(rejectedEventId, async (blockOrderId, err) => {
      this.failBlockOrder(blockOrderId, err)
    })

    // TODO: Use an ID instead of the entire BlockOrder so that we can have multiple
    // services handling events
    this.emit(createEventId, blockOrder)

    return id
  }

  /**
   * Get an existing block order
   * @param  {String} blockOrderId ID of the block order
   * @return {BlockOrder}
   */
  async getBlockOrder (blockOrderId) {
    this.logger.info('Getting block order', { id: blockOrderId })

    try {
      var value = await promisify(this.store.get)(blockOrderId)
    } catch (e) {
      if (e.notFound) {
        throw new BlockOrderNotFoundError(blockOrderId, e)
      } else {
        throw e
      }
    }

    const blockOrder = BlockOrder.fromStorage(blockOrderId, value)

    const { logger } = this
    const openOrders = await OrderStateMachine.getAll(
      { store: this.ordersStore, logger },
      // limit the orders we retrieve to those that belong to this blockOrder, i.e. those that are in
      // its prefix range.
      Order.rangeForBlockOrder(blockOrder.id)
    )
    const fills = await FillStateMachine.getAll(
      { store: this.fillsStore, logger },
      // limit the fills we retrieve to those that belong to this blockOrder, i.e. those that are in
      // its prefix range.
      Fill.rangeForBlockOrder(blockOrder.id)
    )

    blockOrder.openOrders = openOrders
    blockOrder.fills = fills

    return blockOrder
  }

  /**
   * Cancel a block order in progress
   * @param  {String} blockOrderId Id of the block order to cancel
   * @return {BlockOrder}          Block order that was cancelled
   */
  async cancelBlockOrder (blockOrderId) {
    this.logger.info('Cancelling block order ', { id: blockOrderId })

    try {
      var value = await promisify(this.store.get)(blockOrderId)
    } catch (e) {
      if (e.notFound) {
        throw new BlockOrderNotFoundError(blockOrderId, e)
      } else {
        throw e
      }
    }

    const blockOrder = BlockOrder.fromStorage(blockOrderId, value)

    const orders = await getRecords(
      this.ordersStore,
      (key, value) => {
        const { order, state } = JSON.parse(value)
        return { order: Order.fromObject(key, order), state }
      },
      // limit the orders we retrieve to those that belong to this blockOrder, i.e. those that are in
      // its prefix range.
      Order.rangeForBlockOrder(blockOrder.id)
    )

    this.logger.info(`Found ${orders.length} orders associated with Block Order ${blockOrder.id}`)

    // filter for only orders we can cancel
    const { CREATED, PLACED } = OrderStateMachine.STATES
    const openOrders = orders.filter(({ state }) => state === CREATED || state === PLACED)

    this.logger.info(`Found ${openOrders.length} orders in a state to be cancelled for Block order ${blockOrder.id}`)

    try {
      await Promise.all(openOrders.map(({ order }) => {
        const orderId = order.orderId
        const authorization = this.relayer.identity.authorize(orderId)
        this.logger.debug(`Generated authorization for ${orderId}`, authorization)
        return this.relayer.makerService.cancelOrder({ orderId, authorization })
      }))
    } catch (e) {
      this.logger.error('Failed to cancel all orders for block order: ', { blockOrderId })
      this.failBlockOrder(blockOrderId, e)
      throw e
    }

    this.logger.info(`Cancelled ${orders.length} underlying orders for ${blockOrder.id}`)

    blockOrder.cancel()

    await promisify(this.store.put)(blockOrder.key, blockOrder.value)

    this.logger.info('Moved block order to cancelled state', { id: blockOrder.id })

    return blockOrder
  }

  /**
   * Get existing block orders
   * @param  {String} market to filter by
   * @return {Array<BlockOrder>}
   */
  async getBlockOrders (market) {
    this.logger.info(`Getting all block orders for market: ${market}`)
    const allRecords = await getRecords(this.store, BlockOrder.fromStorage.bind(BlockOrder))
    const recordsForMarket = allRecords.filter((record) => record.marketName === market)
    return recordsForMarket
  }

  /**
   * Move a block order to a failed state
   * @param  {String} blockOrderId ID of the block order to be failed
   * @param  {Error}  err          Error that caused the failure
   * @return {void}
   */
  async failBlockOrder (blockOrderId, err) {
    // TODO: expose the stack trace of err because it is hard to troubleshoot without it
    this.logger.error('Error encountered while working block', { id: blockOrderId, error: err.toString() })
    this.logger.info('Moving block order to failed state', { id: blockOrderId })

    // TODO: move status to its own sublevel so it can be updated atomically
    try {
      var value = await promisify(this.store.get)(blockOrderId)
    } catch (e) {
      // TODO: throw here? what's the protocol?
      if (e.notFound) {
        this.logger.error('Attempted to move a block order to a failed state that does not exist', { id: blockOrderId })
      } else {
        this.logger.error('Error while retrieving block order to move it to a failed state', { id: blockOrderId, error: e.message })
        throw e
      }
    }

    const blockOrder = BlockOrder.fromStorage(blockOrderId, value)

    // TODO: fail the remaining orders that are tied to this block order in the ordersStore?
    blockOrder.fail()

    await promisify(this.store.put)(blockOrder.key, blockOrder.value)

    this.logger.info('Moved block order to failed state', { id: blockOrderId })
  }

  /**
   * work a block order that gets created
   * @param  {BlockOrder} blockOrder Block Order to work
   * @return {void}
   */
  async workBlockOrder (blockOrder) {
    this.logger.info('Working block order', { blockOrderId: blockOrder.id })

    const orderbook = this.orderbooks.get(blockOrder.marketName)

    if (!orderbook) {
      throw new Error(`No orderbook is initialized for created order in the ${blockOrder.marketName} market.`)
    }

    if (!blockOrder.price) {
      // block orders without prices are Market orders and take the best available price
      await this.workMarketBlockOrder(blockOrder)
    } else {
      await this.workLimitBlockOrder(blockOrder)
    }
  }

  /**
   * Work market block order
   * @param  {BlockOrder} blockOrder BlockOrder without a limit price, i.e. a market order
   * @return {void}
   */
  async workMarketBlockOrder (blockOrder) {
    const orderbook = this.orderbooks.get(blockOrder.marketName)
    const targetDepth = Big(blockOrder.baseAmount)

    const { orders, depth } = await orderbook.getBestOrders({ side: blockOrder.inverseSide, depth: targetDepth.toString() })

    if (Big(depth).lt(targetDepth)) {
      throw new Error(`Insufficient depth in ${blockOrder.inverseSide} to fill ${targetDepth.toString()}`)
    }

    return this._fillOrders(blockOrder, orders, targetDepth.toString())
  }

  /**
   * Work limit block order
   * @todo make limit orders more sophisticated than just sending a single limit order to the relayer
   * @param  {BlockOrder} blockOrder BlockOrder with a limit price
   * @return {void}
   */
  async workLimitBlockOrder (blockOrder) {
    if (blockOrder.timeInForce !== BlockOrder.TIME_RESTRICTIONS.GTC) {
      throw new Error('Only Good-til-cancelled limit orders are currently supported.')
    }

    const orderbook = this.orderbooks.get(blockOrder.marketName)
    const targetDepth = Big(blockOrder.baseAmount)

    // fill as many orders at our price or better
    const { orders, depth: availableDepth } = await orderbook.getBestOrders({ side: blockOrder.inverseSide, depth: targetDepth.toString(), quantumPrice: blockOrder.quantumPrice })
    await this._fillOrders(blockOrder, orders, targetDepth.toString())

    if (targetDepth.gt(availableDepth)) {
      // place an order for the remaining depth that we could not fill
      this._placeOrder(blockOrder, targetDepth.minus(availableDepth).toString())
    }
  }

  /**
   * Move a block order to a completed state if all orders have been completed
   * @param {String} blockOrderId
   */
  async completeBlockOrder (blockOrderId) {
    this.logger.info('Attempting to put block order in a completed state', { id: blockOrderId })

    // TODO: move status to its own sublevel so it can be updated atomically
    try {
      var value = await promisify(this.store.get)(blockOrderId)
    } catch (e) {
      // TODO: throw here? what's the protocol?
      if (e.notFound) {
        this.logger.error('Attempted to move a block order to a completed state that does not exist', { id: blockOrderId })
      } else {
        this.logger.error('Error while retrieving block order to move it to a completed state', { id: blockOrderId, error: e.message })
        throw e
      }
    }

    const blockOrder = BlockOrder.fromStorage(blockOrderId, value)

    // TODO: fail the remaining orders that are tied to this block order in the ordersStore?
    blockOrder.complete()

    await promisify(this.store.put)(blockOrder.key, blockOrder.value)

    this.logger.info('Moved block order to completed state', { id: blockOrderId })
  }

  /**
   * Place an order for a block order of a given amount
   * @param  {BlockOrder} blockOrder Block Order to place an order on behalf of
   * @param  {String} amount     Int64 amount, in base currency's base units to place the order for
   * @return {void}
   */
  async _placeOrder (blockOrder, baseAmount) {
    // order params
    const { baseSymbol, counterSymbol, side, counterAmount } = blockOrder

    // state machine params
    const { relayer, engines, logger } = this
    const store = this.ordersStore

    if (!engines.has(baseSymbol)) {
      throw new Error(`No engine available for ${baseSymbol}`)
    }

    if (!engines.has(counterSymbol)) {
      throw new Error(`No engine available for ${counterSymbol}`)
    }

    this.logger.info('Creating order for BlockOrder', { blockOrderId: blockOrder.id })

    const order = await OrderStateMachine.create(
      {
        relayer,
        engines,
        logger,
        store
      },
      blockOrder.id,
      { side, baseSymbol, counterSymbol, baseAmount, counterAmount }
    )

    // Register listener events for the current order
    const onceCompleteEvent = async (blockOrderId) => this.completeBlockOrder(blockOrderId)
    const onceRejectedEvent = async (blockOrderId) => this.failBlockOrder(blockOrderId, order.error)

    // These events tie directory in the StateMachine's lifecycle hooks for a OrderStateMachine
    order.once('complete', onceCompleteEvent)
    order.once('rejected', onceRejectedEvent)

    this.logger.info('Created order for BlockOrder', { blockOrderId: blockOrder.id, orderId: order.orderId })
  }

  /**
   * Fill given orders for a given block order up to a target depth
   * @param  {BlockOrder}              blockOrder  BlockOrder that the orders are being filled on behalf of
   * @param  {Array<MarketEventOrder>} orders      Orders to be filled
   * @param  {String}                  targetDepth Int64 string of the maximum depth to fill
   * @return {Promise<Array<FillStateMachine>>}    Promise that resolves the array of Fill State Machines for these fills
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

    const promisedFills = orders.map((order) => {
      const depthRemaining = targetDepth.minus(currentDepth)

      // if we have already reached our target depth, create no further fills
      if (depthRemaining.lte(0)) {
        return
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
      )

      // Register listener events for the current order
      const onceExecutedEvent = async (blockOrderId) => this.completeBlockOrder(blockOrderId)
      const onceRejectedEvent = async (blockOrderId) => this.failBlockOrder(blockOrderId, order.error)

      // These events tie directory in the StateMachine's lifecycle hooks for a FillStateMachine
      fsm.once('execute', onceExecutedEvent)
      fsm.once('rejected', onceRejectedEvent)

      return fsm
    })

    // filter out null values, they are orders we decided not to fill
    return Promise.all(promisedFills.filter(promise => promise))
  }
}

module.exports = BlockOrderWorker
