const MarketEvent = require('./market-event')

class MarketEventOrder {
  constructor ({ orderId, createdAt, baseAmount, counterAmount, side }) {
    this.orderId = orderId
    this.createdAt = createdAt
    this.baseAmount = baseAmount
    this.counterAmount = counterAmount
    this.side = side
  }

  get key () {
    return this.orderId
  }

  get value () {
    const { createdAt, baseAmount, counterAmount, side } = this
    return JSON.stringify({ createdAt, baseAmount, counterAmount, side })
  }

  // TODO: Better math library to handle this?
  get price () {
    return this.counterAmount / this.baseAmount
  }

  static fromEvent (event) {
    const params = {
      orderId: event.orderId
    }

    if (event.eventType === MarketEvent.TYPES.PLACED) {
      Object.assign(params, {
        createdAt: event.timestamp,
        baseAmount: event.payload.baseAmount,
        counterAmount: event.payload.counterAmount,
        side: event.payload.side
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

// TODO: get from proto?
MarketEventOrder.SIDES = Object.freeze({
  ASK: 'ASK',
  BID: 'BID'
})

module.exports = MarketEventOrder
