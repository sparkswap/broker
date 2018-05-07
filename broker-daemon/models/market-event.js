class MarketEvent {
  constructor ({ eventId, orderId, timestamp, eventType, ...payload }) {
    if (!Object.keys(this.constructor.TYPES).includes(eventType)) {
      throw new Error(`MarketEvents do not support a "${eventType}" type.`)
    }

    this.eventId = eventId
    this.orderId = orderId
    this.timestamp = timestamp
    this.eventType = eventType
    this.payload = payload
    this.sep = this.constructor.sep
  }

  get key () {
    return `${this.timestamp}${this.sep}${this.eventId}`
  }

  get value () {
    const { orderId, eventType, payload } = this
    return { orderId, eventType, ...payload }
  }

  serialize () {
    const { eventId, orderId, eventType, timestamp, payload } = this
    return {
      eventId,
      orderId,
      eventType,
      timestamp,
      ...payload
    }
  }

  static fromStorage (key, value) {
    const [timestamp, eventId] = key.split(this.sep)

    return new this({ timestamp, eventId, ...value })
  }
}

MarketEvent.TYPES = Object.freeze({
  PLACED: 'PLACED',
  FILLED: 'FILLED',
  CANCELLED: 'CANCELLED'
})
MarketEvent.sep = ':'

module.exports = MarketEvent
