const EventEmitter = require('events')
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
      if(!err) {
        this.logger.error('BlockOrderWorker: error event triggered with no error')
      }
    })

    this.on('blockOrder:create', async (blockOrder) => {
      try {
        this.workBlockOrder(blockOrder)
      } catch(err) {
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

    const blockOrder = new BlockOrder({ id, marketName, side, amount, price, timeInForce })

    await this.store.put(blockOrder.key, blockOrder.value)

    this.logger.info(`Created and stored block order`, { id: blockOrder.id })

    this.emit('blockOrder:create', blockOrder)

    return id
  }

  async workBlockOrder (blockOrder) {
    this.logger.info('Working block order', blockOrder)

    const orderbook = this.orderbooks.get(blockOrder.marketName)

    if (!orderbook) {
      // TODO: set an error state on the order
      // https://trello.com/c/sYjdpS7B/209-error-states-on-orders-that-are-being-worked-in-the-background
      return throw new Error(`No orderbook is initialized for created order in the ${blockOrder.marketName} market.`)
    }

    if (!blockOrder.price) {
      // TODO: set an error state on the order
      // https://trello.com/c/sYjdpS7B/209-error-states-on-orders-that-are-being-worked-in-the-background
      return throw new Error('Only market orders are supported.')
    }

    // TODO: actual sophisticated order handling instead of just pass through

    const { baseSymbol, counterSymbol } = orderbook
    const baseAmount = blockOrder.amount.toString()
    const counterAmount = blockOrder.amount.multiply(blockOrder.price).toString()
    const side = blockOrder.side

    this.logger.info(`Creating single order for BlockOrder ${blockOrder.id}`)

    await this.createOrder(blockOrder.id, { baseSymbol, counterSymbol, baseAmount, counterAmount, side })
  }

  async createOrder (blockOrderId, { side, baseSymbol, counterSymbol, baseAmount, counterAmount }) {
    this.logger.debug('Creating an order on the Relayer')

    const store = this.store.sublevel(blockOrderId).sublevel('orders')

    const order = new OrderStateMachine({ relayer: this.relayer, engine: this.engine, logger: this.logger, store: store })

    this.logger.debug('Created new order state machine')

    const { orderId } = await order.create({ side, baseSymbol, counterSymbol, baseAmount, counterAmount })

    this.logger.info('Created order on the relayer', { orderId })
  }
}

module.exports = BlockOrderWorker
