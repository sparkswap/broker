const EventEmitter = require('events')
const { promisify } = require('util')
const safeid = require('generate-safe-id')
const { BlockOrder } = require('../models')
const OrderStateMachine = require('./order-state-machine')

class BlockOrderWorker extends EventEmitter {
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

    this.on('blockOrder:create', async (blockOrder) => {
      try {
        this.workBlockOrder(blockOrder)
      } catch (err) {
        this.emit('error', err)
      }
    })
  }

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

    this.emit('blockOrder:create', blockOrder)

    return id
  }

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
    const { baseSymbol, counterSymbol } = orderbook
    const baseAmount = blockOrder.amount.toString()
    const counterAmount = blockOrder.amount.multiply(blockOrder.price).toString()
    const side = blockOrder.side

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
