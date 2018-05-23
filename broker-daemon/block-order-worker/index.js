const EventEmitter = require('events')
const safeid = require('generate-safe-id')
const { BlockOrder } = require('../models')
const OrderWorker = require('./order-worker')

class BlockOrderWorker extends EventEmitter {
  constructor({ orderbooks, store, logger, relayer }) {
    this.orderbooks = orderbooks
    this.store = store
    this.logger = logger
    this.orderWorker = new OrderWorker({ relayer, store: this.store.sublevel('orders'), logger })
  }

  async createBlockOrder({ marketName, side, amount, price, timeInForce }) {
    const id = safeid()

    const orderbook = this.orderbooks.get(marketName)

    if (!orderbook) {
      throw new Error(`${marketName} is not being tracked as a market. Configure kbd to track ${marketName} using the MARKETS environment variable.`)
    }

    const blockOrder = new BlockOrder({ id, marketName, side, amount, price, timeInForce })

    await this.store.put(blockOrder.key, blockOrder.value)

    this.handleBlockOrder(blockOrder)

    return id
  }

  handleBlockOrder(blockOrder) {
    this.logger.info('Handling block order', blockOrder)

    const orderbook = this.orderbooks.get(blockOrder.marketName)

    if(!orderbook) {
      // TODO: set an error state on the order
      // https://trello.com/c/sYjdpS7B/209-error-states-on-orders-that-are-being-worked-in-the-background
      return this.emit('error', new Error(`No orderbook is initialized for created order in the ${blockOrder.marketName} market.`))
    }

    if(!price) {
      // TODO: set an error state on the order
      // https://trello.com/c/sYjdpS7B/209-error-states-on-orders-that-are-being-worked-in-the-background
      return this.emit('error', new Error('Only market orders are supported.'))
    }

    // TODO: actual sophisticated order handling instead of just pass through
    
    const { baseSymbol, counterSymbol } = orderbook
    const baseAmount = order.amount
    const counterAmount = baseAmount.multiply(order.price)

    await this.orderWorker.createOrder({ baseSymbol, counterSymbol, baseAmount, counterAmount, side })

    this.logger.info('Created an order for the block order', blockOrder)
  }
}

module.exports = OrderWorker
