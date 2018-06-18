const { Big } = require('../utils')

/**
 * @class Order that we create on the Relayer
 */
class Order {
  /**
   * Create a new order representation
   * @param  {String} options.baseSymbol    Currency symbol for the base currency in the market, e.g. BTC
   * @param  {String} options.counterSymbol Currency symbol for the counter or quote currency in the market, e.g. LTC
   * @param  {String} options.side          Side of the transaction that the order is on, either BID or ASK
   * @param  {String} options.baseAmount    Amount, represented as an integer in the base currency's smallest unit, to be transacted
   * @param  {String} options.counterAmount Amount, represented as an integer in the counter currency's smallest unit, to be transacted
   * @param  {String} options.ownerId
   * @param  {String} options.payTo         Identifier on the payment channel network for the maker. e.g. for the lightning network: `ln:{node public key}`
   * @return {Order}                        Order instance
   */
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

  /**
   * Add parameters to the order from its creation on the Relayer
   * @param {String} options.orderId               Unique identifier for the order as assigned by the Relayer
   * @param {String} options.feePaymentRequest     Payment channel network payment request for the order fee
   * @param {String} options.depositPaymentRequest Payment channel network payment request for the order deposit
   */
  setCreatedParams ({ orderId, feePaymentRequest, depositPaymentRequest }) {
    this.orderId = orderId
    this.feePaymentRequest = feePaymentRequest
    this.depositPaymentRequest = depositPaymentRequest
  }

  /**
   * Add parameters to the order from it being filled on the Relayer
   * @param {String} options.swapHash   Base64 string of the swap hash being used for the fill
   * @param {String} options.fillAmount Int64 String of the amount, in base currency's base units, of the fill
   */
  setFilledParams ({ swapHash, fillAmount }) {
    this.swapHash = swapHash
    this.fillAmount = fillAmount
  }

  /**
   * Get the symbol of the currency we will receive inbound if the order is completed
   * @return {String} Currency symbol
   */
  get inboundSymbol () {
    return this.side === Order.SIDES.BID ? this.baseSymbol : this.counterSymbol
  }

  /**
   * Get the symbol of the currency we will send outbound if the order is completed
   * @return {String} Currency symbol
   */
  get outboundSymbol () {
    return this.side === Order.SIDES.BID ? this.counterSymbol : this.baseSymbol
  }

  /**
   * Get the amount (as an integer in its currency's smallest units) that we will receive inbound if this order were to be completely filled
   * @return {String} 64-bit integer represented as a string
   */
  get inboundAmount () {
    return this.side === Order.SIDES.BID ? this.baseAmount : this.counterAmount
  }

  /**
   * Get the amount (as an integer in its currency's smallest units) that we will send outbound if this order were to be completely filled
   * @return {String} 64-bit integer represented as a string
   */
  get outboundAmount () {
    return this.side === Order.SIDES.BID ? this.counterAmount : this.baseAmount
  }

  /**
   * Params required to create an order on the relayer
   * @return {Object} Object of parameters the relayer expects
   */
  get paramsForCreate () {
    const { baseSymbol, counterSymbol, side, baseAmount, counterAmount, ownerId, payTo } = this

    return { baseSymbol, counterSymbol, side, baseAmount, counterAmount, ownerId, payTo }
  }

  /**
   * Params required to prepare a swap in  an engine
   * @return {Object} Object of parameters the engine expects
   */
  get paramsForPrepareSwap () {
    const { swapHash, inboundSymbol, inboundAmount, outboundSymbol, outboundAmount } = this

    if (![ swapHash, inboundSymbol, inboundAmount, outboundSymbol, outboundAmount ].every(param => !!param)) {
      throw new Error('orderId, swapHash, inboundSymbol, inboundAmount, outboundSymbol, outboundAmount are required to prepare a swap.')
    }

    const outbound = { symbol: outboundSymbol, amount: outboundAmount }
    const inbound = { symbol: inboundSymbol, amount: inboundAmount }

    return { swapHash, inbound, outbound }
  }

  /**
   * Price of the order
   * @return {String} Number, rounded to 16 decimal places, represented as a string
   */
  get price () {
    const counterAmount = Big(this.counterAmount)
    const baseAmount = Big(this.baseAmount)

    // TODO: make the number of decimal places configurable
    return counterAmount.div(baseAmount).toFixed(16)
  }

  /**
   * Get the unique key that this object can be stored with
   * @return {String} Unique key for storage. In the case of an order, its Relayer-assigned orderId
   */
  get key () {
    return this.orderId
  }

  /**
   * Get the store-able representation of the object
   * @return {String} Stringified representation of the Order object
   */
  get value () {
    return JSON.stringify(this.valueObject)
  }

  /**
   * Get the store-able object
   * @return {Object} Store-able version of the object
   */
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
      depositPaymentRequest,
      swapHash,
      fillAmount
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
      depositPaymentRequest,
      swapHash,
      fillAmount
    }
  }

  /**
   * Create an instance of an order from a stored copy
   * @param  {String} key   Unique key for the order, i.e. its `orderId`
   * @param  {String} value Stringified representation of the order
   * @return {Order}        Inflated order object
   */
  static fromStorage (key, value) {
    return this.fromObject(key, JSON.parse(value))
  }

  /**
   * Create an instance of an order from an object representation
   * @param  {String} key         Unique key for the order, i.e. its `orderId`
   * @param  {Object} valueObject Plain object representation of the order
   * @return {Order}              Inflated order object
   */
  static fromObject (key, valueObject) {
    const orderId = key

    const { baseSymbol, counterSymbol, side, baseAmount, counterAmount, ownerId, payTo, ...otherParams } = valueObject

    // instantiate with the correct set of params
    const order = new this({ baseSymbol, counterSymbol, side, baseAmount, counterAmount, ownerId, payTo })

    const { feePaymentRequest, depositPaymentRequest, swapHash, fillAmount } = otherParams

    // add any (white-listed) leftover params into the object
    Object.assign(order, { orderId, feePaymentRequest, depositPaymentRequest, swapHash, fillAmount })

    return order
  }
}

// TODO: get from proto?
Order.SIDES = Object.freeze({
  ASK: 'ASK',
  BID: 'BID'
})

module.exports = Order
