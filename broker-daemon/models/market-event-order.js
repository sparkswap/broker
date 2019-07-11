const MarketEvent = require('./market-event')
const Big = require('../utils/big')
const CONFIG = require('../config.json')

/**
 * Class representation from market events that are used for the orderbook. This model
 * is local to the broker only.
 */
class MarketEventOrder {
  /**
   * Create a MarketEventOrder
   * @param {Object} order
   * @param {string} order.orderId       - Unique ID assigned by the relayer to identify an order
   * @param {string} order.createdAt     - When the order was created
   * @param {string} order.baseAmount    - Amount, represented as an integer in the base currency's smallest unit, to be transacted
   * @param {string} order.counterAmount - Amount, represented as an integer in the counter currency's smallest unit, to be transacted
   * @param {string} order.side          - Side of the transaction that the order is on, either BID or ASK
   * @param {string} order.baseSymbol    - Currency symbol for the base currency in the market, e.g. BTC
   * @param {string} order.counterSymbol - Currency symbol for the counter or quote currency in the market, e.g. LTC
   */
  constructor ({ orderId, createdAt, baseAmount, counterAmount, side, baseSymbol, counterSymbol }) {
    this.orderId = orderId
    this.createdAt = createdAt
    this.baseAmount = baseAmount
    this.counterAmount = counterAmount
    this.side = side
    this.baseSymbol = baseSymbol
    this.counterSymbol = counterSymbol
  }

  get key () {
    return this.orderId
  }

  get value () {
    const { createdAt, baseAmount, counterAmount, side, baseSymbol, counterSymbol } = this
    return JSON.stringify({ createdAt, baseAmount, counterAmount, side, baseSymbol, counterSymbol })
  }

  /**
   * Price of the order in the smallest unit for each currency
   * @returns {string} Number, rounded to 16 decimal places, represented as a string
   */
  get quantumPrice () {
    const counterAmount = Big(this.counterAmount)
    const baseAmount = Big(this.baseAmount)

    // TODO: make the number of decimal places configurable
    return counterAmount.div(baseAmount).toFixed(16)
  }

  /**
   * Price of the order in common units for each currency
   * @returns {string} Decimal string of the price in common units
   */
  get price () {
    const baseCurrencyConfig = CONFIG.currencies.find(({ symbol }) => symbol === this.baseSymbol)
    const counterCurrencyConfig = CONFIG.currencies.find(({ symbol }) => symbol === this.counterSymbol)

    const baseCommonAmount = Big(this.baseAmount).div(baseCurrencyConfig.quantumsPerCommon)
    const counterCommonAmount = Big(this.counterAmount).div(counterCurrencyConfig.quantumsPerCommon)

    return counterCommonAmount.div(baseCommonAmount).toFixed(16)
  }

  /**
   * Get the amount of the order - i.e. the number of common units of base currency
   * @returns {string} Decimal string of the amount
   */
  get amount () {
    const baseCurrencyConfig = CONFIG.currencies.find(({ symbol }) => symbol === this.baseSymbol)

    return Big(this.baseAmount).div(baseCurrencyConfig.quantumsPerCommon).toFixed(16)
  }

  /**
   * Serialize the market event order for use by end users
   * @returns {Object}
   */
  serialize () {
    const { orderId, side, price, amount } = this
    return {
      orderId,
      side,
      price,
      amount
    }
  }

  /**
   * @param {Object} event
   * @param {string} marketName
   * @returns {MarketEventOrder}
   */
  static fromEvent (event, marketName) {
    const params = {
      orderId: event.orderId
    }

    if (event.eventType === MarketEvent.TYPES.PLACED) {
      Object.assign(params, {
        createdAt: event.timestamp,
        baseAmount: event.payload.baseAmount.toString(),
        counterAmount: event.payload.counterAmount.toString(),
        side: event.payload.side,
        baseSymbol: marketName.split('/')[0],
        counterSymbol: marketName.split('/')[1]
      })
    }

    return new this(params)
  }

  static fromStorage (key, value) {
    return new this({
      orderId: key,
      ...JSON.parse(value)
    })
  }
}

MarketEventOrder.SIDES = Object.freeze({
  ASK: 'ASK',
  BID: 'BID'
})

module.exports = MarketEventOrder
