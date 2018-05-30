const bigInt = require('big-integer')

/**
 * @class Model representing Block Orders
 */
class BlockOrder {
  /**
   * Instantiate a new Block Order
   * @param  {String} options.id          Unique id for the block order
   * @param  {String} options.marketName  Market name (e.g. BTC/LTC)
   * @param  {String} options.side        Side of the market being taken (i.e. BID or ASK)
   * @param  {String} options.amount      Size of the order in base currency (e.g. '10000')
   * @param  {String} options.price       Limit price for the order (e.g. '100.1')
   * @param  {String} options.timeInForce Time restriction on the order (e.g. GTC, FOK)
   * @param  {String} options.status      Block Order status
   * @return {BlockOrder}
   */
  constructor ({ id, marketName, side, amount, price, timeInForce, status }) {
    this.id = id
    this.marketName = marketName
    this.side = side
    this.amount = bigInt(amount)
    this.price = price ? bigInt(price) : null
    this.timeInForce = timeInForce

    if (!BlockOrder.STATUSES[status]) {
      throw new Error(`Block Order status of ${status} is invalid`)
    }

    this.status = status

    this.openOrders = []
  }

  /**
   * Convenience getter for baseSymbol
   * @return {String} Base symbol from market name (e.g. BTC from BTC/LTC)
   */
  get baseSymbol () {
    return this.marketName.split('/')[0]
  }

  /**
   * Convenience getter for counterSymbol
   * @return {String} Counter symbol from market name (e.g. LTC from BTC/LTC)
   */
  get counterSymbol () {
    return this.marketName.split('/')[1]
  }

  /**
   * get key for storage in leveldb
   * @return {String} Block order id
   */
  get key () {
    return this.id
  }

  /**
   * get value for storage in leveldb
   * @return {String} Stringified JSON object
   */
  get value () {
    const { marketName, side, amount, price, timeInForce, status } = this

    return JSON.stringify({
      marketName,
      side,
      amount: amount.toString(),
      price: price ? price.toString() : null,
      timeInForce,
      status
    })
  }

  /**
   * serialize a block order for transmission via grpc
   * @return {Object} Object to be serialized into a GRPC message
   */
  serialize () {
    const openOrders = this.openOrders.map(({ order, state }) => {
      return {
        orderId: order.orderId,
        amount: order.baseAmount,
        price: bigInt(order.counterAmount).divide(order.baseAmount).toString(),
        orderStatus: state.toUpperCase()
      }
    })

    return {
      market: this.marketName,
      side: this.side,
      amount: this.amount.toString(),
      price: this.price ? this.price.toString() : null,
      timeInForce: this.timeInForce,
      status: this.status,
      openOrders: openOrders
    }
  }

  /**
   * Re-instantiate a previously saved BlockOrder
   * @param  {String} key   Key used to retrieve the BlockOrder
   * @param  {String} value Value returned from leveldb
   * @return {BlockOrder}   BlockOrder instance
   */
  static fromStorage (key, value) {
    const { marketName, side, amount, price, timeInForce, status } = JSON.parse(value)
    const id = key

    return new this({ id, marketName, side, amount, price, timeInForce, status })
  }
}

BlockOrder.STATUSES = Object.freeze({
  ACTIVE: 'ACTIVE',
  CANCELLED: 'CANCELLED',
  COMPLETED: 'COMPLETED'
})

module.exports = BlockOrder
