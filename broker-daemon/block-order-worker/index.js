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
    let currentDepth = Big('0')

    const orders = await orderbook.getBestOrders({ side: blockOrder.inverseSide, depth: targetDepth.toString() })

    // state machine params
    const { relayer, engine, logger } = this
    const store = this.store.sublevel(blockOrder.id).sublevel('fills')

    return Promise.all(orders.map((order, index) => {
      let fillAmount

      // Only the last order is a partial fill
      if (index < orders.length - 1) {
        fillAmount = order.baseAmount
      } else {
        fillAmount = targetDepth.minus(currentDepth).toString()
      }

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
    }))
  }

  /**
   * Work limit block order
   * @todo make limit orders more sophisticated than just sending a single limit order to the relayer
   * @param  {BlockOrder} blockOrder BlockOrder with a limit price
   * @return {void}
   */
  async workLimitBlockOrder (blockOrder) {
    // order params
    const { baseSymbol, counterSymbol, baseAmount, counterAmount, side } = blockOrder

    // state machine params
    const { relayer, engine, logger } = this
    const store = this.store.sublevel(blockOrder.id).sublevel('orders')

    this.logger.info('Creating single order for BlockOrder', { blockOrderId: blockOrder.id })

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

    this.logger.info('Created single order for BlockOrder', { blockOrderId: blockOrder.id, orderId: order.orderId })
  }
}

module.exports = BlockOrderWorker
