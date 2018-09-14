class MarketEvent {
  constructor ({ eventId, orderId, timestamp, eventType, version, ...payload }) {
    if (!Object.keys(this.constructor.TYPES).includes(eventType)) {
      throw new Error(`MarketEvents do not support a "${eventType}" type.`)
    }

    this.eventId = eventId
    this.orderId = orderId
    this.timestamp = timestamp
    this.eventType = eventType
    this.version = version
    this.payload = payload
    this.sep = this.constructor.sep
  }

  get key () {
    return `${this.timestamp}${this.sep}${this.eventId}${this.sep}${this.version}`
  }

  get value () {
    const { orderId, eventType, payload } = this
    return JSON.stringify({ orderId, eventType, ...payload })
  }

  serialize () {
    const { eventId, orderId, eventType, timestamp, version, payload } = this
    return {
      eventId,
      orderId,
      eventType,
      timestamp,
      version,
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
    const [timestamp, eventId, version] = key.split(this.sep)
    return new this({ timestamp, eventId, version, ...JSON.parse(value) })
  }
}

MarketEvent.TYPES = Object.freeze({
  PLACED: 'PLACED',
  FILLED: 'FILLED',
  CANCELLED: 'CANCELLED'
})

MarketEvent.sep = ':'

module.exports = MarketEvent
