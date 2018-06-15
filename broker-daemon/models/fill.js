const Order = require('./order')
const { Big } = require('../utils')

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
   * Add a swap hash to the fill
   * @param {String} swapHash Base64 string of the hash for the swap asssociated with this fill
   */
  setSwapHash (swapHash) {
    this.swapHash = swapHash
  }

  /**
   * Add parameters to the fill from its creation on the Relayer
   * @param {String} options.fillId                Unique identifier for the fill as assigned by the Relayer
   * @param {String} options.feePaymentRequest     Payment channel network payment request for the fill fee
   * @param {String} options.depositPaymentRequest Payment channel network payment request for the fill deposit
   */
  setCreatedParams ({ fillId, feePaymentRequest, depositPaymentRequest }) {
    this.fillId = fillId
    this.feePaymentRequest = feePaymentRequest
    this.depositPaymentRequest = depositPaymentRequest
  }

  /**
   * Set params from execution on an order
   * @param {String} options.payTo Address of the counterparty for the swap
   */
  setExecuteParams ({ payTo }) {
    this.payTo = payTo
  }

  /**
   * Params required to create an order on the relayer
   * @return {Object} Object of parameters the relayer expects
   */
  get paramsForCreate () {
    const { fillAmount, swapHash, order: { orderId } } = this

    return { fillAmount, orderId, swapHash }
  }

  /**
   * Params required to execute a swap on the payment channel network
   * @return {Object} Object of parameters an engine expects
   */
  get paramsForSwap () {
    const { payTo, swapHash, inboundSymbol, inboundAmount, outboundSymbol, outboundAmount } = this

    if (![ payTo, swapHash, inboundSymbol, inboundAmount, outboundSymbol, outboundAmount ].every(param => !!param)) {
      throw new Error('payTo, swapHash, inboundSymbol, inboundAmount, outboundSymbol, outboundAmount are required params for execution')
    }

    const counterpartyPubKey = payTo
    const inbound = { symbol: inboundSymbol, amount: inboundAmount }
    const outbound = { symbol: outboundSymbol, amount: outboundAmount }

    return { counterpartyPubKey, swapHash, inbound, outbound }
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
    const baseAmount = Big(this.order.baseAmount)
    const counterAmount = Big(this.order.counterAmount)
    const fillAmount = Big(this.fillAmount)

    // since we are dealing in the smallest units, we want an integer
    return counterAmount.times(fillAmount).div(baseAmount).round(0).toString()
  }

  /**
   * Get the symbol of the currency we will receive inbound if the fill is completed
   * @return {String} Currency symbol
   */
  get inboundSymbol () {
    return this.order.side === Order.SIDES.BID ? this.order.counterSymbol : this.order.baseSymbol
  }

  /**
   * Get the symbol of the currency we will send outbound if the fill is completed
   * @return {String} Currency symbol
   */
  get outboundSymbol () {
    return this.order.side === Order.SIDES.BID ? this.order.baseSymbol : this.order.counterSymbol
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
   * Price of the order
   * @return {String} Number, rounded to 16 decimal places, represented as a string
   */
  get price () {
    const counterAmount = Big(this.order.counterAmount)
    const baseAmount = Big(this.order.baseAmount)

    // TODO: make the number of decimal places configurable
    return counterAmount.div(baseAmount).toFixed(16)
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
      depositPaymentRequest,
      payTo
    } = this

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
      depositPaymentRequest,
      payTo
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

    const { order: { orderId, baseSymbol, counterSymbol, side, baseAmount, counterAmount }, fillAmount, ...otherParams } = valueObject

    // instantiate with the correct set of params
    const fill = new this({ orderId, baseSymbol, counterSymbol, side, baseAmount, counterAmount }, { fillAmount })

    const { swapHash, feePaymentRequest, depositPaymentRequest, payTo } = otherParams

    // add any (white-listed) leftover params into the object
    Object.assign(fill, { fillId, swapHash, feePaymentRequest, depositPaymentRequest, payTo })

    return fill
  }
}

module.exports = Fill
