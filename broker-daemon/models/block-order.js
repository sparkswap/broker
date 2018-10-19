const { promisify } = require('util')
const nano = require('nano-seconds')

const { Big, nanoToDatetime } = require('../utils')
const CONFIG = require('../config')
const { BlockOrderNotFoundError } = require('./errors')

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
  constructor ({ id, marketName, side, amount, price, timeInForce, timestamp, status = BlockOrder.STATUSES.ACTIVE }) {
    this.id = id
    this.marketName = marketName
    this.price = price ? Big(price) : null
    this.status = status
    this.timestamp = timestamp || nano.toString()

    if (!this.baseCurrencyConfig) {
      throw new Error(`No currency configuration is available for ${this.baseSymbol}`)
    }

    if (!this.counterCurrencyConfig) {
      throw new Error(`No currency configuration is available for ${this.counterSymbol}`)
    }

    if (!BlockOrder.TIME_RESTRICTIONS[timeInForce]) {
      throw new Error(`${timeInForce} is not a supported time restriction`)
    }
    this.timeInForce = timeInForce

    if (!BlockOrder.SIDES[side]) {
      throw new Error(`${side} is not a valid side for a BlockOrder`)
    }
    this.side = side

    if (!amount) {
      throw new Error(`A transaction amount is required to create a block order`)
    }

    this.amount = Big(amount)

    if (this.baseAmount !== this.amount.times(this.baseCurrencyConfig.quantumsPerCommon).toString()) {
      throw new Error(`Amount is too precise for ${this.baseSymbol}`)
    }

    this.openOrders = []
    this.fills = []
  }

  get datetime () {
    return nanoToDatetime(this.timestamp)
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
   * Get configuration for the baseSymbol
   * @return {Object} Currency configuration
   */
  get baseCurrencyConfig () {
    return CONFIG.currencies.find(({ symbol }) => symbol === this.baseSymbol)
  }

  /**
   * Get configuration for the counterSymbol
   * @return {Object} Currency configuration
   */
  get counterCurrencyConfig () {
    return CONFIG.currencies.find(({ symbol }) => symbol === this.counterSymbol)
  }

  /**
   * Convenience getter for baseAmount
   * @return {String} String representation of the amount of currency to be transacted in base currency's smallest unit
   */
  get baseAmount () {
    return this.amount.times(this.baseCurrencyConfig.quantumsPerCommon).round(0).toString()
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

    const counterCommonAmount = this.amount.times(this.price)
    return counterCommonAmount.times(this.counterCurrencyConfig.quantumsPerCommon).round(0).toString()
  }

  /**
   * Price of an order expressed in terms of the smallest unit of each currency
   * @return {String} Decimal of the price expressed as a string with 16 decimal places
   */
  get quantumPrice () {
    if (!this.counterAmount) return
    return Big(this.counterAmount).div(this.baseAmount).toFixed(16)
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
    const {
      marketName,
      side,
      amount,
      price,
      timeInForce,
      timestamp,
      status
    } = this

    return JSON.stringify({
      marketName,
      side,
      amount: amount.toString(),
      price: price ? price.toString() : null,
      timeInForce,
      timestamp,
      status
    })
  }

  /**
   * Move the block order to a failed status
   * @return {BlockOrder} Modified block order instance
   */
  fail () {
    // TODO: Do we need to fail the remaining orders that are tied to this block order in the ordersStore?
    this.status = BlockOrder.STATUSES.FAILED
    return this
  }

  /**
   * Move the block order to a completed status
   * @return {BlockOrder} Modified block order instance
   */
  complete () {
    this.status = BlockOrder.STATUSES.COMPLETED
    return this
  }

  /**
   * Move the block order to a cancelled status
   * @return {BlockOrder} Modified block order instance
   */
  cancel () {
    // TODO: Do we need to cancel the remaining orders that are tied to this block order in the ordersStore?
    this.status = BlockOrder.STATUSES.CANCELLED
    return this
  }

  /**
   * serialize a block order for transmission via grpc
   * @return {Object} Object to be serialized into a GRPC message
   */
  serialize () {
    const baseAmountFactor = this.baseCurrencyConfig.quantumsPerCommon
    const counterAmountFactor = this.counterCurrencyConfig.quantumsPerCommon

    const openOrders = this.openOrders.map(({ order, state, error }) => {
      const baseCommonAmount = Big(order.baseAmount).div(baseAmountFactor)
      const counterCommonAmount = Big(order.counterAmount).div(counterAmountFactor)

      return {
        orderId: order.orderId,
        amount: baseCommonAmount.toFixed(16),
        price: counterCommonAmount.div(baseCommonAmount).toFixed(16),
        orderStatus: state.toUpperCase(),
        orderError: error ? error.toString() : undefined
      }
    })

    const fills = this.fills.map(({ fill, state, error }) => {
      const baseCommonAmount = Big(fill.fillAmount).div(baseAmountFactor)
      const counterCommonAmount = Big(fill.counterFillAmount).div(counterAmountFactor)

      return {
        orderId: fill.order.orderId,
        fillId: fill.fillId,
        amount: baseCommonAmount.toFixed(16),
        price: counterCommonAmount.div(baseCommonAmount).toFixed(16),
        fillStatus: state.toUpperCase(),
        fillError: error ? error.toString() : undefined
      }
    })

    const serialized = {
      market: this.marketName,
      side: this.side,
      amount: this.amount.toFixed(16),
      timeInForce: this.timeInForce,
      status: this.status,
      timestamp: this.timestamp,
      datetime: this.datetime,
      openOrders: openOrders,
      fills: fills
    }

    if (this.price) {
      serialized.limitPrice = this.price.toFixed(16)
    } else {
      serialized.isMarketOrder = true
    }

    return serialized
  }

  serializeSummary () {
    const serialized = {
      blockOrderId: this.id,
      market: this.marketName,
      side: this.side,
      amount: this.amount.toFixed(16),
      timeInForce: this.timeInForce,
      timestamp: this.timestamp,
      datetime: this.datetime,
      status: this.status
    }

    if (this.price) {
      serialized.limitPrice = this.price.toFixed(16)
    } else {
      serialized.isMarketOrder = true
    }

    return serialized
  }

  /**
   * Re-instantiate a previously saved BlockOrder
   *
   * @param  {String} key   Key used to retrieve the BlockOrder
   * @param  {String} value Value returned from leveldb
   * @return {BlockOrder}   BlockOrder instance
   */
  static fromStorage (key, value) {
    const {
      marketName,
      side,
      amount,
      price,
      timeInForce,
      timestamp,
      status
    } = JSON.parse(value)

    const id = key

    if (!BlockOrder.STATUSES[status]) {
      throw new Error(`Block Order status of ${status} is invalid`)
    }

    return new this({ id, marketName, side, amount, price, timeInForce, timestamp, status })
  }

  /**
   * Grab a block order from a given sublevel
   *
   * @param {Sublevel} store block order sublevel store
   * @param {String} blockOrderId
   * @return {BlockOrder} BlockOrder instance
   * @throws {Error} store is null
   * @throws {BlockOrderNotFoundError} block order could not be found
   */
  static async fromStore (store, blockOrderId) {
    if (!store) throw new Error('[BlockOrder#fromStore] No store is defined')

    try {
      var value = await promisify(store.get)(blockOrderId)
    } catch (e) {
      if (e.notFound) {
        throw new BlockOrderNotFoundError(blockOrderId, e)
      }
      throw e
    }

    return BlockOrder.fromStorage(blockOrderId, value)
  }
}

BlockOrder.TIME_RESTRICTIONS = Object.freeze({
  GTC: 'GTC'
})

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

BlockOrder.ERRORS = Object.freeze({
  BlockOrderNotFoundError
})

module.exports = BlockOrder
