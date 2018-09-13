/**
 * Class representation of a Market Event coming from the Sparkswap Relayer
 */
class MarketEvent {
  /**
   *
   * @param {Object} event
   * @param {String} event.eventId
   * @param {String} event.orderId
   * @param {String} event.timestamp
   * @param {String} event.eventType
   * @param {String} event.eventNumber
   * @param {Object} event.payload - all other additional params from a market event
   */
  constructor ({ eventId, orderId, timestamp, eventType, eventNumber, ...payload }) {
    if (!Object.keys(this.constructor.TYPES).includes(eventType)) {
      throw new Error(`MarketEvents do not support a "${eventType}" type.`)
    }

    this.eventId = eventId
    this.orderId = orderId
    this.timestamp = timestamp
    this.eventType = eventType
    this.eventNumber = eventNumber
    this.payload = payload
    this.sep = this.constructor.sep
  }

  /**
   * Returns a key for a market event
   * Example: <timestamp>:<eventId>:<eventNumber>
   *
   * @returns {String}
   */
  get key () {
    return `${this.timestamp}${this.sep}${this.eventId}`
  }

  /**
   * Returns all values for a market event, excluding timestamp, eventId and eventNumber
   *
   * @returns {String} res - JSON encoded string
   */
  get value () {
    const { orderId, eventType, eventNumber, payload } = this
    return JSON.stringify({ orderId, eventType, eventNumber, ...payload })
  }

  /**
   * Serializes a market event for storage
   *
   * @returns {Object} res
   * @returns {String} res.eventId
   * @returns {String} res.orderId
   * @returns {String} res.eventType
   * @returns {String} res.eventNumber
   * @returns {String} res.timestamp
   * @returns {String} res.payload - additional properties from the market event
   */
  serialize () {
    const { eventId, eventNumber, orderId, eventType, timestamp, payload } = this

    return {
      eventId,
      eventNumber,
      orderId,
      eventType,
      timestamp,
      ...payload
    }
  }

  /**
   * @returns {String} res - serialized market event
   */
  toString () {
    return JSON.stringify(this.serialize())
  }

  /**
   * Takes a string representation of a market event (from leveldb) and creates
   * a MarketEvent class w/ its properties
   *
   * @param {String} key
   * @param {String} value
   * @returns {MarkeEvent}
   */
  static fromStorage (key, value) {
    const [timestamp, eventId, eventNumber] = key.split(this.sep)

    return new this({ timestamp, eventId, eventNumber, ...JSON.parse(value) })
  }
}

MarketEvent.TYPES = Object.freeze({
  PLACED: 'PLACED',
  FILLED: 'FILLED',
  CANCELLED: 'CANCELLED'
})

MarketEvent.sep = ':'

module.exports = MarketEvent
