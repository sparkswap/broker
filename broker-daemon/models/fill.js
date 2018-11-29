const Order = require('./order')
const { Big } = require('../utils')

/**
 * Delimiter for the block order id and fill id when storing fills
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
 * Upper bound for leveldb ranged queries
 * @type {String}
 * @constant
 */
const UPPER_BOUND = '\uffff'

/**
 * @class Fill that we create on the Relayer
 */
class Fill {
  /**
   * Create a fill for an existing order
   * @param  {String} blockOrderId        Id of the block order this fill is associated with
   * @param  {String} order.orderId       Unique ID assigned by the relayer to identify an order
   * @param  {String} order.baseSymbol    Currency symbol for the base currency in the market, e.g. BTC
   * @param  {String} order.counterSymbol Currency symbol for the counter or quote currency in the market, e.g. LTC
   * @param  {String} order.side          Side of the transaction that the order is on, either BID or ASK
   * @param  {String} order.baseAmount    Amount, represented as an integer in the base currency's smallest unit, to be transacted
   * @param  {String} order.counterAmount Amount, represented as an integer in the counter currency's smallest unit, to be transacted
   * @param  {String} fill.fillAmount     Amount, represented as an integer in the base currency's smallets unit, that the order is filled with
   * @param  {String} fill.takerBaseAddress   address for the taker base symbol
   * @param  {String} fill.takerCounterAddress   address for the taker counter symbol
   * @return {Fill}                       Fill instance
   */
  constructor (blockOrderId, { orderId, baseSymbol, counterSymbol, side, baseAmount, counterAmount }, { fillAmount, takerBaseAddress, takerCounterAddress }) {
    this.blockOrderId = blockOrderId

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
    this.takerBaseAddress = takerBaseAddress
    this.takerCounterAddress = takerCounterAddress
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
   * @param {String}  options.fillId                Unique identifier for the fill as assigned by the Relayer
   * @param {String}  options.feePaymentRequest     Payment channel network payment request for the fill fee
   * @param {Boolean} options.feeRequired           Whether the fee is required
   * @param {String}  options.depositPaymentRequest Payment channel network payment request for the fill deposit
   * @param {Boolean} options.depositRequired       Whether the deposit is required
   */
  setCreatedParams ({ fillId, feePaymentRequest, feeRequired, depositPaymentRequest, depositRequired }) {
    this.fillId = fillId
    this.feePaymentRequest = feePaymentRequest
    this.feeRequired = feeRequired
    this.depositPaymentRequest = depositPaymentRequest
    this.depositRequired = depositRequired
  }

  /**
   * Set params from execution on an order
   * @param {String} options.makerAddress Address of the counterparty for the swap
   */
  setExecuteParams ({ makerAddress }) {
    this.makerAddress = makerAddress
  }

  /**
   * Params required to create an order on the relayer
   * @return {Object} Object of parameters the relayer expects
   */
  get paramsForCreate () {
    const {
      fillAmount,
      swapHash,
      takerBaseAddress,
      takerCounterAddress,
      order: {
        orderId
      }
    } = this

    return {
      fillAmount,
      orderId,
      swapHash,
      takerBaseAddress,
      takerCounterAddress
    }
  }

  /**
   * Params required to fill an order on the relayer
   * @return {Object} Object of parameters the relayer expects
   */
  get paramsForFill () {
    const {
      feePaymentRequest,
      feeRequired,
      depositPaymentRequest,
      depositRequired,
      fillId,
      outboundSymbol
    } = this

    if (feeRequired && !feePaymentRequest) {
      throw new Error(`paramsForFill: feePaymentRequest is required.`)
    }

    if (depositRequired && !depositPaymentRequest) {
      throw new Error(`paramsForFill: depositPaymentRequest is required.`)
    }

    if (!fillId) {
      throw new Error(`paramsForFill: fillId is required.`)
    }

    if (!outboundSymbol) {
      throw new Error(`paramsForFill: outboundSymbol is required.`)
    }

    return {
      feePaymentRequest,
      feeRequired,
      depositPaymentRequest,
      depositRequired,
      fillId,
      outboundSymbol
    }
  }

  /**
   * Params required to execute a swap on the payment channel network
   * @return {Object} Object of parameters an engine expects
   */
  get paramsForSwap () {
    const {
      makerAddress,
      swapHash,
      outboundSymbol,
      outboundAmount
    } = this

    if (![ makerAddress, swapHash, outboundSymbol, outboundAmount ].every(param => !!param)) {
      throw new Error('makerAddress, swapHash, outboundSymbol, outboundAmount are required params for execution')
    }

    return {
      makerAddress,
      swapHash,
      symbol: outboundSymbol,
      amount: outboundAmount
    }
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
   * Price of the order in the smallest unit of each currency
   * @return {String} Number, rounded to 16 decimal places, represented as a string
   */
  get quantumPrice () {
    const counterAmount = Big(this.order.counterAmount)
    const baseAmount = Big(this.order.baseAmount)

    // TODO: make the number of decimal places configurable
    return counterAmount.div(baseAmount).toFixed(16)
  }

  /**
   * Get the unique key that this object can be stored with
   * It is prefixed by the blockOrderId so that it can be retrieved easily
   * @return {String} Unique key for storage. In the case of a fill it is a combination of the blockOrderId and Relayer-assigned fillId
   */
  get key () {
    // if either part of our key is undefined we return undefined so as not to create
    // a record with a bad key (e.g. no fillId or no blockOrderId)
    if (!this.fillId || !this.blockOrderId) {
      return undefined
    }
    return `${this.blockOrderId}${DELIMITER}${this.fillId}`
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
      feeRequired,
      depositPaymentRequest,
      depositRequired,
      makerAddress,
      takerBaseAddress,
      takerCounterAddress
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
      feeRequired,
      depositPaymentRequest,
      depositRequired,
      makerAddress,
      takerBaseAddress,
      takerCounterAddress
    }
  }

  /**
   * Create an instance of an fill object from a stored copy
   * @param  {String} key   Unique key for the order, i.e. its `fillId`
   * @param  {String} fillStateMachineRecord Stringified representation of the order
   * @return {Object} Inflated fill object
   */
  static fromStorage (key, fillStateMachineRecord) {
    return this.fromObject(key, JSON.parse(fillStateMachineRecord).fill)
  }

  /**
   * Create an instance of an fill from an object representation
   * @param  {String} key         Unique key for the fill, i.e. its `blockOrderId` and `fillId`
   * @param  {Object} valueObject Plain object representation of the fill
   * @return {Fill}              Inflated fill object
   */
  static fromObject (key, valueObject) {
    // keys are the unique id for the object (orderId) prefixed by the object they belong to (blockOrderId)
    // and are separated by the delimiter (:)
    const [ blockOrderId, fillId ] = key.split(DELIMITER)

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
      takerBaseAddress,
      takerCounterAddress,
      ...otherParams
    } = valueObject

    // instantiate with the correct set of params
    const fill = new this(
      blockOrderId,
      {
        orderId,
        baseSymbol,
        counterSymbol,
        side,
        baseAmount,
        counterAmount
      },
      {
        fillAmount,
        takerBaseAddress,
        takerCounterAddress
      }
    )

    const {
      swapHash,
      feePaymentRequest,
      feeRequired,
      depositPaymentRequest,
      depositRequired,
      makerAddress
    } = otherParams

    // add any (white-listed) leftover params into the object
    Object.assign(fill, {
      fillId,
      swapHash,
      feePaymentRequest,
      feeRequired,
      depositPaymentRequest,
      depositRequired,
      makerAddress
    })

    return fill
  }

  /**
   * Create a set of options that can be passed to a LevelUP `createReadStream` call
   * that limits the set to fills that belong to the given blockOrderId.
   * This works because all fills are prefixed with their blockOrderId and the Delimiter.
   * @param  {String} Id of of the block order to create a range for
   * @return {Object} Options object that can be used in {@link https://github.com/Level/levelup#createReadStream}
   */
  static rangeForBlockOrder (blockOrderId) {
    return {
      gte: `${blockOrderId}${DELIMITER}${LOWER_BOUND}`,
      lte: `${blockOrderId}${DELIMITER}${UPPER_BOUND}`
    }
  }
}

module.exports = Fill
