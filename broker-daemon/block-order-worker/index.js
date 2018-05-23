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
  }

  handleError(err) {
    this.emit('error', err || new Error('Unknown error'))
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

    // this is intentionally not `await`ed so we can return to the caller
    this.handleBlockOrder(blockOrder).catch(this.handleError.bind(this))

    return id
  }

  async handleBlockOrder (blockOrder) {
    this.logger.info('Handling block order', blockOrder)

    const orderbook = this.orderbooks.get(blockOrder.marketName)

    if (!orderbook) {
      // TODO: set an error state on the order
      // https://trello.com/c/sYjdpS7B/209-error-states-on-orders-that-are-being-worked-in-the-background
      return this.emit('error', new Error(`No orderbook is initialized for created order in the ${blockOrder.marketName} market.`))
    }

    if (!blockOrder.price) {
      // TODO: set an error state on the order
      // https://trello.com/c/sYjdpS7B/209-error-states-on-orders-that-are-being-worked-in-the-background
      return this.emit('error', new Error('Only market orders are supported.'))
    }

    // TODO: actual sophisticated order handling instead of just pass through

    const { baseSymbol, counterSymbol } = orderbook
    const baseAmount = blockOrder.amount.toString()
    const counterAmount = blockOrder.amount.multiply(blockOrder.price).toString()

    this.logger.info(`Creating single order for BlockOrder ${blockOrder.id}`)

    await this.createOrder(blockOrder.id, { baseSymbol, counterSymbol, baseAmount, counterAmount, side: blockOrder.side })

    this.logger.info('Created an order for the block order', blockOrder)
  }

  async createOrder (blockOrderId, { side, baseSymbol, counterSymbol, baseAmount, counterAmount }) {
    this.logger.info('Creating an order on the Relayer')

    const store = this.store.sublevel(blockOrderId).sublevel('orders')

    const order = new OrderStateMachine({ relayer: this.relayer, engine: this.engine, logger: this.logger, store: store })

    this.logger.debug('Created new order state machine')

    const { orderId } = await order.create({ side, baseSymbol, counterSymbol, baseAmount, counterAmount })

    this.logger.info('Created order on the relayer', { orderId })
  }
}

module.exports = BlockOrderWorker
