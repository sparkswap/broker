class MarketEvent {
  constructor ({ eventId, orderId, timestamp, sequence, eventType, ...payload }) {
    this.eventId = eventId
    this.orderId = orderId
    this.timestamp = timestamp
    this.sequence = sequence
    this.eventType = eventType
    this.payload = payload
    this.sep = this.constructor.sep
  }

  get key () {
    return `${this.timestamp}${this.sep}${this.sequence}${this.sep}${this.eventId}`
  }

  get value () {
    const { orderId, eventType, payload } = this
    return { orderId, eventType, ...payload }
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

  static fromStorage (key, value) {
    const [timestamp, sequence, eventId] = key.split(this.sep)

    return new this({ timestamp, sequence, eventId, ...value })
  }
}

MarketEvent.TYPES = Object.freeze({
  PLACED: 'PLACED',
  FILLED: 'FILLED',
  CANCELLED: 'CANCELLED'
})
MarketEvent.sep = ':'

module.exports = MarketEvent
