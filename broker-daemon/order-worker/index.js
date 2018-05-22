const EventEmitter = require('events')
const safeid = require('generate-safe-id')
const Order = require('./order')
const RelayerOrderWorker = require('./relayer-order-worker')

class OrderWorker extends EventEmitter {
  constructor({ orderbooks, store, logger, relayer }) {
    this.orderbooks = orderbooks
    this.store = store
    this.logger = logger
    this.relayerOrderWorker = new RelayerOrderWorker({ relayer, store: this.store.sublevel('relayer-orders'), logger })
  }

  async createOrder({ marketName, side, amount, price, timeInForce }) {
    const id = safeid()

    const orderbook = this.orderbooks.get(marketName)

    if (!orderbook) {
      throw new Error(`${marketName} is not being tracked as a market. Configure kbd to track ${marketName} using the MARKETS environment variable.`)
    }

    const order = new Order({ id, marketName, side, amount, price, timeInForce })

    await this.store.put(order.key, order.value)

    this.handleOrder(order)

    return id
  }

  handleOrder(order) {
    this.logger.info('Handling order', order)

    const orderbook = this.orderbooks.get(order.marketName)

    if(!orderbook) {
      // TODO: set an error state on the order
      // https://trello.com/c/sYjdpS7B/209-error-states-on-orders-that-are-being-worked-in-the-background
      return this.emit('error', new Error(`No orderbook is initialized for created order in the ${order.marketName} market.`))
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

    await this.relayerOrderWorker.createOrder({ baseSymbol, counterSymbol, baseAmount, counterAmount, side })

    this.logger.info('Created an order for the block', order)
  }
}

module.exports = OrderWorker
