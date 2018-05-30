const EventEmitter = require('events')
const { promisify } = require('util')
const safeid = require('generate-safe-id')
const { BlockOrder } = require('../models')
const OrderStateMachine = require('./order-state-machine')

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

    // TODO: Make this way better
    // https://trello.com/c/sYjdpS7B/209-error-states-on-orders-that-are-being-worked-in-the-background
    this.on('error', (err) => {
      this.logger.error('BlockOrderWorker: error encountered', { message: err.message, stack: err.stack })
      if (!err) {
        this.logger.error('BlockOrderWorker: error event triggered with no error')
      }
    })

    this.on('BlockOrder:create', async (blockOrder) => {
      try {
        await this.workBlockOrder(blockOrder)
      } catch (err) {
        this.emit('error', err)
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

    const status = BlockOrder.STATUSES.ACTIVE

    const blockOrder = new BlockOrder({ id, marketName, side, amount, price, timeInForce, status })

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

    const value = await promisify(this.store.get)(blockOrderId)

    if (!value) {
      throw new Error(`No Block Order found with ID: ${blockOrderId}`)
    }

    const blockOrder = BlockOrder.fromStorage(blockOrderId, value)

    const { relayer, engine, logger } = this
    const openOrders = await OrderStateMachine.getAll({ store: this.store.sublevel(blockOrder.id).sublevel('orders'), relayer, engine, logger })

    blockOrder.openOrders = openOrders

    return blockOrder
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
      // TODO: set an error state on the order
      // https://trello.com/c/sYjdpS7B/209-error-states-on-orders-that-are-being-worked-in-the-background
      throw new Error(`No orderbook is initialized for created order in the ${blockOrder.marketName} market.`)
    }

    if (!blockOrder.price) {
      // TODO: set an error state on the order
      // https://trello.com/c/sYjdpS7B/209-error-states-on-orders-that-are-being-worked-in-the-background
      throw new Error('Market orders are not supported: please provide a limit price.')
    }

    // TODO: actual sophisticated order handling instead of just pass through

    // order params
    const { baseSymbol, counterSymbol, side } = blockOrder
    const baseAmount = blockOrder.amount.toString()
    const counterAmount = blockOrder.amount.multiply(blockOrder.price).toString()

    // state machine params
    const { relayer, engine, logger } = this
    const store = this.store.sublevel(blockOrder.id).sublevel('orders')

    this.logger.info('Creating single order for BlockOrder', { blockOrderId: blockOrder.id })

    const order = await OrderStateMachine.create(
      { relayer, engine, logger, store },
      { side, baseSymbol, counterSymbol, baseAmount, counterAmount }
    )

    this.logger.info('Created single order for BlockOrder', { blockOrderId: blockOrder.id, orderId: order.id })
  }
}

module.exports = BlockOrderWorker
