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
