const Big = require('big.js')

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
  constructor ({ id, marketName, side, amount, price, timeInForce, status = BlockOrder.STATUSES.ACTIVE }) {
    this.id = id
    this.marketName = marketName
    this.price = price ? Big(price) : null
    this.timeInForce = timeInForce
    this.status = status

    if (!BlockOrder.SIDES[side]) {
      throw new Error(`${side} is not a valid side for a BlockOrder`)
    }
    this.side = side

    if (!amount) {
      throw new Error(`A transaction amount is required to create a block order`)
    }
    this.amount = Big(amount)

    this.openOrders = []
    this.fills = []
  }

  /**
   * Convenience getter for the inverse side of the market
   * @return {String} `BID` or `ASK`
   */
  get inverseSide () {
    if (this.side === BlockOrder.SIDES.BID) {
      return BlockOrder.SIDES.ASK
    }

    return BlockOrder.SIDES.BID
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
   * Convenience getter for baseAmount
   * @return {String} String representation of the amount of currency to be transacted in base currency's smallest unit
   */
  get baseAmount () {
    return this.amount.toString()
  }

  /**
   * Convenience getter for counterAmount calculated using the block order price
   * @return {String} String representation of the amount of currency to be transacted in counter currency's smallest unit
   */
  get counterAmount () {
    if (!this.price) {
      // if we can't calculate the amount, we treat the property as unset, i.e. undefined
      return
    }
    return this.amount.times(this.price).round(0).toString()
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
   * Move the block order to a failed status
   * @return {BlockOrder} Modified block order instance
   */
  fail () {
    this.status = BlockOrder.STATUSES.FAILED

    return this
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
        price: order.price,
        orderStatus: state.toUpperCase()
      }
    })

    const fills = this.fills.map(({ fill, state }) => {
      return {
        orderId: fill.order.orderId,
        fillId: fill.fillId,
        amount: fill.fillAmount,
        price: fill.price,
        fillStatus: state.toUpperCase()
      }
    })

    const serialized = {
      market: this.marketName,
      side: this.side,
      amount: this.amount.toString(),
      timeInForce: this.timeInForce,
      status: this.status,
      openOrders: openOrders,
      fills: fills
    }

    if (this.price) {
      serialized.limitPrice = this.price.toString()
    } else {
      serialized.isMarketOrder = true
    }

    return serialized
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

    if (!BlockOrder.STATUSES[status]) {
      throw new Error(`Block Order status of ${status} is invalid`)
    }

    return new this({ id, marketName, side, amount, price, timeInForce, status })
  }
}

BlockOrder.SIDES = Object.freeze({
  BID: 'BID',
  ASK: 'ASK'
})

BlockOrder.STATUSES = Object.freeze({
  ACTIVE: 'ACTIVE',
  CANCELLED: 'CANCELLED',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED'
})

module.exports = BlockOrder
