const EventEmitter = require('events')
const { promisify } = require('util')
const safeid = require('generate-safe-id')
const { BlockOrder } = require('../models')
const { OrderStateMachine, FillStateMachine } = require('../state-machines')
const { BlockOrderNotFoundError } = require('./errors')
const { Big } = require('../utils')

/**
 * @class Create and work Block Orders
 */
class BlockOrderWorker extends EventEmitter {
  /**
   * Create a new BlockOrderWorker instance
   * @param  {Map} options.orderbooks         Collection of all active Orderbooks
   * @param  {sublevel} options.store         Sublevel in which to store block orders and child orders
   * @param  {Object} options.logger
   * @param  {RelayerClient} options.relayer
   * @param  {Engine} options.engine
   * @return {BlockOrderWorker}
   */
  constructor ({ orderbooks, store, logger, relayer, engine }) {
    super()
    this.orderbooks = orderbooks
    this.store = store
    this.logger = logger
    this.relayer = relayer
    this.engine = engine

    this.on('BlockOrder:create', async (blockOrder) => {
      try {
        await this.workBlockOrder(blockOrder)
      } catch (err) {
        this.failBlockOrder(blockOrder.id, err)
      }
    })
  }

  /**
   * Create a new block order
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
      throw new Error(`${marketName} is not being tracked as a market. Configure kbd to track ${marketName} using the MARKETS environment variable.`)
    }

    const blockOrder = new BlockOrder({ id, marketName, side, amount, price, timeInForce })

    await promisify(this.store.put)(blockOrder.key, blockOrder.value)

    this.logger.info(`Created and stored block order`, { blockOrderId: blockOrder.id })

    this.emit('BlockOrder:create', blockOrder)

    return id
  }

  /**
   * Get an existing block order
   * @param  {String} blockOrderId ID of the block order
   * @return {BlockOrder}
   */
  async getBlockOrder (blockOrderId) {
    this.logger.info('Getting block order', { id: blockOrderId })

    let value

    try {
      value = await promisify(this.store.get)(blockOrderId)
    } catch (e) {
      if (e.notFound) {
        throw new BlockOrderNotFoundError(blockOrderId, e)
      } else {
        throw e
      }
    }

    const blockOrder = BlockOrder.fromStorage(blockOrderId, value)

    const { relayer, engine, logger } = this
    const openOrders = await OrderStateMachine.getAll({ store: this.store.sublevel(blockOrder.id).sublevel('orders'), relayer, engine, logger })
    const fills = await FillStateMachine.getAll({ store: this.store.sublevel(blockOrder.id).sublevel('fills'), relayer, engine, logger })

    blockOrder.openOrders = openOrders
    blockOrder.fills = fills

    return blockOrder
  }

  async cancelBlockOrder (blockOrderId) {
    this.logger.info('Cancelling block order', { id: blockOrderId })

    let value

    try {
      value = await promisify(this.store.get)(blockOrderId)
    } catch (e) {
      if (e.notFound) {
        throw new BlockOrderNotFoundError(blockOrderId, e)
      } else {
        throw e
      }
    }

    const blockOrder = BlockOrder.fromStorage(blockOrderId, value)

    this.logger.info('Retrieved block order for cancellation', { id: blockOrder.id })

    // BIG QUESTION: should we make sure we have a single instance of each state machine?
    // is there danger in instantiating multiple
    throw new Error('Cancelling block orders is not yet implemented')
  }

  /**
   * Move a block order to a failed state
   * @param  {String} blockOrderId ID of the block order to be failed
   * @param  {Error}  err          Error that caused the failure
   * @return {void}
   */
  async failBlockOrder (blockOrderId, err) {
    // TODO: expose the stack trace of err because it is hard to troubleshoot without it
    this.logger.error('Error encountered while working block', { id: blockOrderId, error: err.message })
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

    blockOrder.fail()

    await promisify(this.store.put)(blockOrder.key, blockOrder.value)

    this.logger.info('Moved block order to failed state', { id: blockOrderId })

    this.emit('BlockOrder:fail', blockOrder)
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
    const targetDepth = Big(blockOrder.amount)

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
    const targetDepth = Big(blockOrder.amount)

    // fill as many orders at our price or better
    const { orders, depth: availableDepth } = await orderbook.getBestOrders({ side: blockOrder.inverseSide, depth: targetDepth.toString(), price: blockOrder.price.toString() })
    await this._fillOrders(blockOrder, orders, targetDepth.toString())

    if (targetDepth.gt(availableDepth)) {
      // place an order for the remaining depth that we could not fill
      this._placeOrder(blockOrder, targetDepth.minus(availableDepth).toString())
    }
  }

  /**
   * Place an order for a block order of a given amount
   * @param  {BlockOrder} blockOrder Block Order to place an order on behalf of
   * @param  {String} amount     Int64 amount, in base currency's base units to place the order for
   * @return {void}
   */
  async _placeOrder (blockOrder, amount) {
    // order params
    const { baseSymbol, counterSymbol, side } = blockOrder
    const baseAmount = amount.toString()
    const counterAmount = Big(amount).times(blockOrder.price).round(0).toString()

    // state machine params
    const { relayer, engine, logger } = this
    const store = this.store.sublevel(blockOrder.id).sublevel('orders')

    this.logger.info('Creating order for BlockOrder', { blockOrderId: blockOrder.id })

    const order = await OrderStateMachine.create(
      {
        relayer,
        engine,
        logger,
        store,
        onRejection: (err) => {
          this.failBlockOrder(blockOrder.id, err)
        }
      },
      { side, baseSymbol, counterSymbol, baseAmount, counterAmount }
    )

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
    const { relayer, engine, logger } = this
    const store = this.store.sublevel(blockOrder.id).sublevel('fills')

    const promisedFills = orders.map((order, index) => {
      const depthRemaining = targetDepth.minus(currentDepth)

      // if we have already reached our target depth, create no further fills
      if (depthRemaining.lte(0)) {
        return
      }

      // Take the smaller of the remaining desired depth or the base amount of the order
      const fillAmount = depthRemaining.gt(order.baseAmount) ? order.baseAmount : depthRemaining.toString()

      // track our current depth so we know what to fill on the next order
      currentDepth = currentDepth.plus(fillAmount)

      return FillStateMachine.create(
        {
          relayer,
          engine,
          logger,
          store,
          onRejection: (err) => {
            // TODO: continue working the order after individual fills fail
            this.failBlockOrder(blockOrder.id, err)
          }
        },
        order,
        { fillAmount }
      )
    })

    // filter out null values, they are orders we decided not to fill
    return Promise.all(promisedFills.filter(promise => promise))
  }
}

module.exports = BlockOrderWorker
