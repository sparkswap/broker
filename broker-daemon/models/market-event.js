const nano = require('nano-seconds')

const { Big, nanoTimestampToNanoType } = require('../utils')
const CONFIG = require('../config')

/**
 * Delimiter for MarketEvent keys
 * @type {String}
 * @constant
 */
const DELIMITER = ':'

/**
 * Lower bound for leveldb ranged queries
 * @type {String}
 * @constant
 */
const LOWER_BOUND = '\x00'

/**
 * Class representation from watchMarket events coming from the relayer.
 */
class MarketEvent {
  constructor ({ eventId, orderId, timestamp, eventType, sequence, ...payload }) {
    if (!Object.keys(this.constructor.TYPES).includes(eventType)) {
      throw new Error(`MarketEvents do not support a "${eventType}" type.`)
    }

    this.eventId = eventId
    this.orderId = orderId
    this.timestamp = timestamp
    this.eventType = eventType
    this.sequence = sequence
    this.payload = payload
    this.sep = this.constructor.sep
  }

  get key () {
    return `${this.timestamp}${this.sep}${this.sequence}${this.sep}${this.eventId}`
  }

  get value () {
    const { orderId, eventType, payload } = this
    return JSON.stringify({ orderId, eventType, ...payload })
  }

  /**
   * Get the amount of the order - i.e. the number of common units of base currency
   * @return {String} Decimal string of the amount
   */
  amount (baseSymbol) {
    const baseCurrencyConfig = CONFIG.currencies.find(({ symbol }) => symbol === baseSymbol)

    return Big(this.payload.fillAmount).div(baseCurrencyConfig.quantumsPerCommon).toFixed(16)
  }

  /**
   * Price of the order in common units for each currency
   * @return {String} Decimal string of the price in common units
   */
  price (baseSymbol, counterSymbol) {
    const baseCurrencyConfig = CONFIG.currencies.find(({ symbol }) => symbol === baseSymbol)
    const counterCurrencyConfig = CONFIG.currencies.find(({ symbol }) => symbol === counterSymbol)

    const baseCommonAmount = Big(this.payload.baseAmount).div(baseCurrencyConfig.quantumsPerCommon)
    const counterCommonAmount = Big(this.payload.counterAmount).div(counterCurrencyConfig.quantumsPerCommon)

    console.log(this.payload)
    console.log(this.payload)

    if (baseCommonAmount.eq(0)) {
      return Big(0).toString()
    }

    return counterCommonAmount.div(baseCommonAmount).toFixed(16)
  }

  tradeInfo (marketName) {
    const [baseSymbol, counterSymbol] = marketName.split('/')
    const nanostamp = nanoTimestampToNanoType(this.timestamp)
    const info = {
      id: this.eventId,
      timestamp: this.timestamp,
      datetime: nano.toISOString(nanostamp),
      order: this.orderId,
      symbol: marketName,
      type: this.price ? 'limit' : 'market',
      side: this.payload.side.toLowerCase() === 'bid' ? 'buy' : 'sell',
      price: this.price(baseSymbol, counterSymbol),
      amount: this.amount(baseSymbol)
    }
    return info
  }

  serialize () {
    const { eventId, orderId, eventType, timestamp, sequence, payload } = this
    return {
      eventId,
      orderId,
      eventType,
      timestamp,
      sequence,
      ...payload
    }
  }

  toString () {
    return JSON.stringify(this.serialize())
  }

  /**
   * Given key/value data from the db, return a MarketEvent
   *
   * @param {String} key
   * @param {Value} value
   * @returns {MarketEvent}
   */
  static fromStorage (key, value) {
    const [timestamp, sequence, eventId] = key.split(this.sep)
    return new this({ timestamp, sequence, eventId, ...JSON.parse(value) })
  }

  /**
   * Returns a range query for leveldb from a given timestamp
   *
   * @param {String} startTime - time in nanoseconds
   * @return {Object} range
   * @return {String} range.gte
   *
   */
  static rangeFromTimestamp (startTime) {
    return {
      gte: `${startTime}${DELIMITER}${LOWER_BOUND}`
    }
  }
}

MarketEvent.TYPES = Object.freeze({
  PLACED: 'PLACED',
  FILLED: 'FILLED',
  CANCELLED: 'CANCELLED'
})

MarketEvent.sep = ':'

module.exports = MarketEvent
