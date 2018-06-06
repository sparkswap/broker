const bigInt = require('big-integer')
const Order = require('./order')

/**
 * @class Fill that we create on the Relayer
 */
class Fill {
  /**
   * Create a fill for an existing order
   * @param  {String} order.orderId       Unique ID assigned by the relayer to identify an order
   * @param  {String} order.baseSymbol    Currency symbol for the base currency in the market, e.g. BTC
   * @param  {String} order.counterSymbol Currency symbol for the counter or quote currency in the market, e.g. LTC
   * @param  {String} order.side          Side of the transaction that the order is on, either BID or ASK
   * @param  {String} order.baseAmount    Amount, represented as an integer in the base currency's smallest unit, to be transacted
   * @param  {String} order.counterAmount Amount, represented as an integer in the counter currency's smallest unit, to be transacted
   * @param  {String} fill.fillAmount     Amount, represented as an integer in the base currency's smallets unit, that the order is filled with
   * @return {Fill}                       Fill instance
   */
  constructor ({ orderId, baseSymbol, counterSymbol, side, baseAmount, counterAmount }, { fillAmount }) {
    this.order = {
      orderId,
      baseSymbol,
      counterSymbol,
      baseAmount,
      counterAmount
    }

    if (!Order.SIDES[side]) {
      throw new Error(`${side} is not a valid order side.`)
    }

    this.order.side = side

    this.fillAmount = fillAmount
  }

  /**
   * Add parameters to the fill from its creation on the Relayer
   * @param {String} options.fillId                Unique identifier for the fill as assigned by the Relayer
   * @param {String} options.feePaymentRequest     Payment channel network payment request for the fill fee
   * @param {String} options.depositPaymentRequest Payment channel network payment request for the fill deposit
   */
  addCreatedParams ({ fillId, feePaymentRequest, depositPaymentRequest }) {
    this.fillId = fillId
    this.feePaymentRequest = feePaymentRequest
    this.depositPaymentRequest = depositPaymentRequest
  }

  /**
   * Params required to create an order on the relayer
   * @return {Object} Object of parameters the relayer expects
   */
  get createParams () {
    const { baseSymbol, counterSymbol, side, baseAmount, counterAmount, ownerId, payTo } = this

    return { baseSymbol, counterSymbol, side, baseAmount, counterAmount, ownerId, payTo }
  }

  /**
   * Alias for `fillAmount`
   * @return {String} Amount, represented as an integer in the base currency's smallest unit, that the order is filled with
   */
  get baseFillAmount () {
    return this.fillAmount
  }

  /**
   * Amount, in the counter currency's base units that will be filled in this fill
   * @return {String} Amount, represented as an integer in the counter currency's smallest unit, that the order willb e fille with
   */
  get counterFillAmount () {
    const baseAmount = bigInt(this.order.baseAmount)
    const counterAmount = bigInt(this.order.counterAmount)
    const fillAmount = bigInt(this.fillAmount)

    // TODO
  }

  /**
   * Get the symbol of the currency we will receive inbound if the fill is completed
   * @return {String} Currency symbol
   */
  get inboundSymbol () {
    return this.order.side === Order.SIDES.BID ? this.counterSymbol : this.baseSymbol
  }

  /**
   * Get the symbol of the currency we will send outbound if the fill is completed
   * @return {String} Currency symbol
   */
  get outboundSymbol () {
    return this.order.side === Order.SIDES.BID ? this.baseSymbol : this.counterSymbol
  }

  /**
   * Get the amount (as an integer in its currency's smallest units) that we will receive inbound if this fill is completed
   * @return {String} 64-bit integer represented as a string
   */
  get inboundAmount () {
    return this.order.side === Order.SIDES.BID ? this.counterFillAmount : this.baseFillAmount
  }

  /**
   * Get the amount (as an integer in its currency's smallest units) that we will send outbound if this fill is completed
   * @return {String} 64-bit integer represented as a string
   */
  get outboundAmount () {
    return this.order.side === Order.SIDES.BID ? this.baseFillAmount : this.counterFillAmount
  }

  /**
   * Get the unique key that this object can be stored with
   * @return {String} Unique key for storage. In the case of an order, its Relayer-assigned orderId
   */
  get key () {
    return this.fillId
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
      order,
      fillAmount,
      swapHash,
      feePaymentRequest,
      depositPaymentRequest
    } = this

    const {
      orderId,
      baseSymbol,
      counterSymbol,
      side,
      baseAmount,
      counterAmount
    } = order

    return {
      order: {
        orderId,
        baseSymbol,
        counterSymbol,
        side,
        baseAmount,
        counterAmount
      },
      fillAmount,
      swapHash,
      feePaymentRequest,
      depositPaymentRequest
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
   * Create an instance of an fill from an object representation
   * @param  {String} key         Unique key for the fill, i.e. its `fillId`
   * @param  {Object} valueObject Plain object representation of the fill
   * @return {Fill}              Inflated fill object
   */
  static fromObject (key, valueObject) {
    const fillId = key

    const { order, fillAmount, ...otherParams } = valueObject
    const { orderId, baseSymbol, counterSymbol, side, baseAmount, counterAmount } = order

    // instantiate with the correct set of params
    const fill = new this({ orderId, baseSymbol, counterSymbol, side, baseAmount, counterAmount }, { fillAmount })

    const { swapHash, feePaymentRequest, depositPaymentRequest } = otherParams

    // add any (white-listed) leftover params into the object
    Object.assign(fill, { fillId, swapHash, feePaymentRequest, depositPaymentRequest })

    return fill
  }
}

module.exports = Fill
