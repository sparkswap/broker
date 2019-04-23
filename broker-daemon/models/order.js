const { Big } = require('../utils')
const CONFIG = require('../config')
/**
 * Delimiter for the block order id and order when storing orders
 * @constant
 * @type {string}
 * @default
 */
const DELIMITER = ':'

/**
 * Lower bound for leveldb ranged queries
 * @constant
 * @type {string}
 * @default
 */
const LOWER_BOUND = '\x00'

/**
 * Upper bound for leveldb ranged queries
 * @constant
 * @type {string}
 * @default
 */
const UPPER_BOUND = '\uffff'

/**
 * @class Order that we create on the Relayer
 */
class Order {
  /**
   * Create a new order representation
   * @param {string} blockOrderId          - Id of the block order that this order belongs to
   * @param {Object} args
   * @param {string} args.baseSymbol    - Currency symbol for the base currency in the market, e.g. BTC
   * @param {string} args.counterSymbol - Currency symbol for the counter or quote currency in the market, e.g. LTC
   * @param {string} args.side          - Side of the transaction that the order is on, either BID or ASK
   * @param {string} args.baseAmount    - Amount, represented as an integer in the base currency's smallest unit, to be transacted
   * @param {string} args.counterAmount - Amount, represented as an integer in the counter currency's smallest unit, to be transacted
   * @param {string} args.makerBaseAddress  - Identifier on the payment channel network for the maker base symbol. e.g. for the lightning network: `bolt:{node public key}`
   * @param {string} args.makerCounterAddress  - Identifier on the payment channel network for the maker counter symbol. e.g. for the lightning network: `bolt:{node public key}`
   */
  constructor (blockOrderId, { baseSymbol, counterSymbol, side, baseAmount, counterAmount, makerBaseAddress, makerCounterAddress }) {
    this.blockOrderId = blockOrderId
    this.baseSymbol = baseSymbol
    this.counterSymbol = counterSymbol
    this.baseAmount = baseAmount
    this.counterAmount = counterAmount
    this.makerBaseAddress = makerBaseAddress
    this.makerCounterAddress = makerCounterAddress

    if (!Order.SIDES[side]) {
      throw new Error(`${side} is not a valid order side.`)
    }

    this.side = side
  }

  /**
   * Add parameters to the order from its creation on the Relayer
   * @param {Object} params
   * @param {string} params.orderId               - Unique identifier for the order as assigned by the Relayer
   * @param {string} params.feePaymentRequest     - Payment channel network payment request for the order fee
   * @param {string} params.feeRequired           - Whether the order fee is required
   * @param {string} params.depositPaymentRequest - Payment channel network payment request for the order deposit
   * @param {string} params.depositRequired       - Whether the deposit is required
   */
  setCreatedParams ({ orderId, feePaymentRequest, feeRequired, depositPaymentRequest, depositRequired }) {
    this.orderId = orderId
    this.feePaymentRequest = feePaymentRequest
    this.feeRequired = feeRequired
    this.depositPaymentRequest = depositPaymentRequest
    this.depositRequired = depositRequired
  }

  /**
   * Add parameters to the order from it being filled on the Relayer
   * @param {Object} params
   * @param {string} params.swapHash   - Base64 string of the swap hash being used for the fill
   * @param {string} params.fillAmount - Int64 String of the amount, in base currency's base units, of the fill
   * @param {string} params.takerAddress - String of payment channel network address of the taker
   */
  setFilledParams ({ swapHash, fillAmount, takerAddress }) {
    this.swapHash = swapHash
    this.fillAmount = fillAmount
    this.takerAddress = takerAddress
  }

  /**
   * Add parameters to the order from it being settled on the Payment Channel Network
   * @param {Object} params
   * @param {string} params.swapPreimage - Base64 string of the preimage associated with the swap hash
   */
  setSettledParams ({ swapPreimage }) {
    this.swapPreimage = swapPreimage
  }

  /**
   * serialize an order for transmission via grpc
   * @returns {Object} serialzed order to send in a GRPC message
   */
  serialize () {
    const baseAmountFactor = CONFIG.currencies.find(({ symbol }) => symbol === this.baseSymbol).quantumsPerCommon
    const counterAmountFactor = CONFIG.currencies.find(({ symbol }) => symbol === this.counterSymbol).quantumsPerCommon
    const baseCommonAmount = Big(this.baseAmount).div(baseAmountFactor)
    const counterCommonAmount = Big(this.counterAmount).div(counterAmountFactor)
    const fillCommonAmount = this.fillAmount ? Big(this.fillAmount).div(baseAmountFactor).toFixed(16) : this.fillAmount

    return {
      orderId: this.orderId,
      blockOrderId: this.blockOrderId,
      side: this.side,
      baseSymbol: this.baseSymbol,
      counterSymbol: this.counterSymbol,
      amount: baseCommonAmount.toFixed(16),
      price: counterCommonAmount.div(baseCommonAmount).toFixed(16),
      fillAmount: fillCommonAmount
    }
  }

  /**
   * Alias for .fillAmount that pairs better with `counterFillAmount`
   * @returns {string} 64-bit integer represented as a string
   */
  get baseFillAmount () {
    return this.fillAmount
  }

  /**
   * Get the amount of the order's fill in the counter currency's smallest unit
   * @returns {string} 64-bit integer represented as a string
   */
  get counterFillAmount () {
    if (!this.fillAmount) {
      throw new Error(`Cannot calculate counterFillAmount without a fillAmount`)
    }

    const counterFillAmount = Big(this.counterAmount).div(this.baseAmount).times(this.fillAmount)

    // we are dealing in integer units, so we round
    return counterFillAmount.round(0).toString()
  }

  /**
   * Get the symbol of the currency we will receive inbound
   * @returns {string} Currency symbol
   */
  get inboundSymbol () {
    return this.side === Order.SIDES.BID ? this.baseSymbol : this.counterSymbol
  }

  /**
   * Get the symbol of the currency we will send outbound
   * @returns {string} Currency symbol
   */
  get outboundSymbol () {
    return this.side === Order.SIDES.BID ? this.counterSymbol : this.baseSymbol
  }

  /**
   * Get the symbol of the currency we will receive inbound
   * @returns {string} Currency symbol
   */
  get inboundAmount () {
    return this.side === Order.SIDES.BID ? this.baseAmount : this.counterAmount
  }

  /**
   * Get the symbol of the currency we will send outbound
   * @returns {string} Currency symbol
   */
  get outboundAmount () {
    return this.side === Order.SIDES.BID ? this.counterAmount : this.baseAmount
  }

  /**
   * Get the amount (as an integer in its currency's smallest units) that we will receive inbound for this order
   * @returns {string} 64-bit integer represented as a string
   */
  get inboundFillAmount () {
    if (!this.fillAmount) {
      throw new Error(`Cannot calculate inboundFillAmount without a fillAmount`)
    }

    return this.side === Order.SIDES.BID ? this.baseFillAmount : this.counterFillAmount
  }

  /**
   * Get the amount (as an integer in its currency's smallest units) that we will send outbound for this order
   * @returns {string} 64-bit integer represented as a string
   */
  get outboundFillAmount () {
    if (!this.fillAmount) {
      throw new Error(`Cannot calculate outboundFillAmount without a fillAmount`)
    }

    return this.side === Order.SIDES.BID ? this.counterFillAmount : this.baseFillAmount
  }

  /**
   * Params required to create an order on the relayer
   * @returns {Object} Object of parameters the relayer expects
   */
  get paramsForCreate () {
    const {
      baseSymbol,
      counterSymbol,
      side,
      baseAmount,
      counterAmount,
      makerBaseAddress,
      makerCounterAddress
    } = this

    return {
      baseSymbol,
      counterSymbol,
      side,
      baseAmount,
      counterAmount,
      makerBaseAddress,
      makerCounterAddress
    }
  }

  /**
   * Params required to place an order on the relayer
   * It includes parameters for the payment requests for fees and deposits
   * which are used to pay fees prior to placing an order rather than
   * actually sent to the relayer.
   * @returns {Object} Object of parameters need to place an order
   */
  get paramsForPlace () {
    const {
      feePaymentRequest,
      feeRequired,
      depositPaymentRequest,
      depositRequired,
      orderId,
      outboundSymbol
    } = this

    if (feeRequired && !feePaymentRequest) {
      throw new Error(`paramsForPlace: feePaymentRequest is missing.`)
    }

    if (depositRequired && !depositPaymentRequest) {
      throw new Error(`paramsForPlace: depositPaymentRequest is missing.`)
    }

    if (!orderId) {
      throw new Error(`paramsForPlace: orderId is missing.`)
    }

    if (!outboundSymbol) {
      throw new Error(`paramsForPlace: outboundSymbol is missing.`)
    }

    return {
      feePaymentRequest,
      feeRequired,
      depositPaymentRequest,
      depositRequired,
      orderId,
      outboundSymbol
    }
  }

  /**
   * Params required to prepare a swap in  an engine
   * @returns {Object} Object of parameters the engine expects
   */
  get paramsForPrepareSwap () {
    const { orderId, swapHash, inboundSymbol, inboundFillAmount } = this

    if (!orderId) {
      throw new Error(`paramsForGetPreimage: orderId is missing.`)
    }
    if (!swapHash) {
      throw new Error(`paramsForGetPreimage: swapHash is missing.`)
    }
    if (!inboundSymbol) {
      throw new Error(`paramsForGetPreimage: inboundSymbol is missing.`)
    }
    if (!inboundFillAmount) {
      throw new Error(`paramsForGetPreimage: inboundFillAmount is missing.`)
    }

    return { orderId, swapHash, symbol: inboundSymbol, amount: inboundFillAmount }
  }

  get paramsForGetPreimage () {
    const { swapHash, inboundSymbol } = this

    if (!swapHash) {
      throw new Error(`paramsForGetPreimage: swapHash is missing.`)
    }
    if (!inboundSymbol) {
      throw new Error(`paramsForGetPreimage: inboundSymbol is missing.`)
    }

    return { swapHash, symbol: inboundSymbol }
  }

  get paramsForComplete () {
    const { swapPreimage, orderId } = this

    if (!swapPreimage) {
      throw new Error(`paramsForGetPreimage: swapPreimage is missing.`)
    }
    if (!orderId) {
      throw new Error(`paramsForGetPreimage: orderId is missing.`)
    }

    return { swapPreimage, orderId }
  }

  /**
   * Price of the order in the smallest unit of each currency
   * @returns {string} Number, rounded to 16 decimal places, represented as a string
   */
  get quantumPrice () {
    const counterAmount = Big(this.counterAmount)
    const baseAmount = Big(this.baseAmount)

    // TODO: make the number of decimal places configurable
    return counterAmount.div(baseAmount).toFixed(16)
  }

  /**
   * Get the unique key that this object can be stored with
   * It is prefixed by the blockOrderId so that it can be retrieved easily
   * @returns {string} Unique key for storage. In the case of an order, it is a combination of the blockOrderId and Relayer-assigned orderId
   */
  get key () {
    // if either part of our key is undefined we return undefined so as not to create
    // a record with a bad key (e.g. no orderId or no blockOrderId)
    if (!this.orderId || !this.blockOrderId) {
      return undefined
    }
    return `${this.blockOrderId}${DELIMITER}${this.orderId}`
  }

  /**
   * Get the store-able representation of the object
   * @returns {string} Stringified representation of the Order object
   */
  get value () {
    return JSON.stringify(this.valueObject)
  }

  /**
   * Get the store-able object
   * @returns {Object} Store-able version of the object
   */
  get valueObject () {
    const {
      baseSymbol,
      counterSymbol,
      side,
      baseAmount,
      counterAmount,
      makerBaseAddress,
      makerCounterAddress,
      feePaymentRequest,
      feeRequired,
      depositPaymentRequest,
      depositRequired,
      swapHash,
      fillAmount,
      takerAddress
    } = this

    return {
      baseSymbol,
      counterSymbol,
      side,
      baseAmount,
      counterAmount,
      makerBaseAddress,
      makerCounterAddress,
      feePaymentRequest,
      feeRequired,
      depositPaymentRequest,
      depositRequired,
      swapHash,
      fillAmount,
      takerAddress
    }
  }

  /**
   * Create an instance of an order from a stored copy
   * @param {string} key   - Unique key for the order, i.e. its `orderId`
   * @param {string} orderStateMachineRecord - Stringified representation of the order state machine record
   * @returns {Order}        Inflated order object
   */
  static fromStorage (key, orderStateMachineRecord) {
    return this.fromObject(key, JSON.parse(orderStateMachineRecord).order)
  }

  /**
   * Create an instance of an order from an object representation
   * @param {string} key         - Unique key for the order, i.e. its `blockOrderId` and `orderId`
   * @param {Object} valueObject - Plain object representation of the order
   * @returns {Order}              Inflated order object
   */
  static fromObject (key, valueObject) {
    // keys are the unique id for the object (orderId) prefixed by the object they belong to (blockOrderId)
    // and are separated by the delimiter (:)
    const [ blockOrderId, orderId ] = key.split(DELIMITER)

    const {
      baseSymbol,
      counterSymbol,
      side,
      baseAmount,
      counterAmount,
      makerBaseAddress,
      makerCounterAddress,
      ...otherParams
    } = valueObject

    // instantiate with the correct set of params
    const order = new this(blockOrderId, {
      baseSymbol,
      counterSymbol,
      side,
      baseAmount,
      counterAmount,
      makerBaseAddress,
      makerCounterAddress
    })

    const {
      feePaymentRequest,
      feeRequired,
      depositPaymentRequest,
      depositRequired,
      swapHash,
      fillAmount,
      takerAddress
    } = otherParams

    // add any (white-listed) leftover params into the object
    Object.assign(order, {
      orderId,
      feePaymentRequest,
      feeRequired,
      depositPaymentRequest,
      depositRequired,
      swapHash,
      fillAmount,
      takerAddress
    })

    return order
  }

  /**
   * Create a set of options that can be passed to a LevelUP `createReadStream` call
   * that limits the set to orders that belong to the given blockOrderid.
   * This works because all orders are prefixed with their blockOrderId and the Delimiter.
   * @param {string} blockOrderId - of of the block order to create a range for
   * @returns {Object} Options object that can be used in {@link https://github.com/Level/levelup#createReadStream}
   */
  static rangeForBlockOrder (blockOrderId) {
    return {
      gte: `${blockOrderId}${DELIMITER}${LOWER_BOUND}`,
      lte: `${blockOrderId}${DELIMITER}${UPPER_BOUND}`
    }
  }
}

Order.SIDES = Object.freeze({
  ASK: 'ASK',
  BID: 'BID'
})

module.exports = Order
