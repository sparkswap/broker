class Order {
  constructor ({ baseSymbol, counterSymbol, side, baseAmount, counterAmount, ownerId, payTo }) {
    this.baseSymbol = baseSymbol
    this.counterSymbol = counterSymbol
    this.baseAmount = baseAmount
    this.counterAmount = counterAmount
    this.ownerId = ownerId
    this.payTo = payTo

    if (!Order.SIDES[side]) {
      throw new Error(`${side} is not a valid order side.`)
    }

    this.side = side
  }

  addCreatedParams ({ orderId, feePaymentRequest, depositPaymentRequest }) {
    this.orderId = orderId
    this.feePaymentRequest = feePaymentRequest
    this.depositPaymentRequest = depositPaymentRequest
  }

  get inboundSymbol () {
    return this.side === Order.SIDES.BID ? this.baseSymbol : this.counterSymbol
  }

  get outboundSymbol () {
    return this.side === Order.SIDES.BID ? this.counterSymbol : this.baseSymbol
  }

  get inboundAmount () {
    return this.side === Order.SIDES.BID ? this.baseAmount : this.counterAmount
  }

  get outboundAmount () {
    return this.side === Order.SIDES.BID ? this.counterAmount : this.baseAmount
  }

  get createParams () {
    const { baseSymbol, counterSymbol, side, baseAmount, counterAmount, ownerId, payTo } = this

    return { baseSymbol, counterSymbol, side, baseAmount, counterAmount, ownerId, payTo }
  }

  get key () {
    return this.orderId
  }

  get value () {
    return JSON.stringify(this.valueObject)
  }

  get valueObject () {
    const {
      baseSymbol,
      counterSymbol,
      side,
      baseAmount,
      counterAmount,
      ownerId,
      payTo,
      feePaymentRequest,
      depositPaymentRequest
    } = this

    return {
      baseSymbol,
      counterSymbol,
      side,
      baseAmount,
      counterAmount,
      ownerId,
      payTo,
      feePaymentRequest,
      depositPaymentRequest
    }
  }

  static fromStorage (key, value) {
    return this.fromObject(key, JSON.parse(value))
  }

  static fromObject (key, valueObject) {
    const orderId = key

    const { baseSymbol, counterSymbol, side, baseAmount, counterAmount, ownerId, payTo, ...otherParams } = valueObject

    // instantiate with the correct set of params
    const order = new this({ baseSymbol, counterSymbol, side, baseAmount, counterAmount, ownerId, payTo })

    const { feePaymentRequest, depositPaymentRequest } = otherParams

    // add any (white-listed) leftover params into the object
    Object.assign(order, { orderId, feePaymentRequest, depositPaymentRequest })

    return order
  }
}

// TODO: get from proto?
Order.SIDES = Object.freeze({
  ASK: 'ASK',
  BID: 'BID'
})

module.exports = Order
