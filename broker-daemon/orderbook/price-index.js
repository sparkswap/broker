const { SublevelIndex } = require('../utils')
const { MarketEventOrder } = require('../models')
/**
 * Largest int64, also the maximum value of prices and amounts
 * @constant
 * @default
 * @type {String}
 */
const MAX_VALUE = '9223372036854775807'
/**
 * Total size of keys for price-based indexes, indicating 16 digits to the left and right of the decimal
 * Used for zero-filling so we can lexicographically sort correctly
 * @constant
 * @default
 * @type {Number}
 */
const PAD_SIZE = 40
/**
 * Number of decimal places all keys should have
 * @constant
 * @default
 * @type {Number}
 */
const DECIMAL_PLACES = 19

/**
 * @class Index by price for a side of the market
 */
class PriceIndex extends SublevelIndex {
  /**
   * Getter for MAX_VALUE for use by descendant classes
   */
  get MAX_VALUE () {
    return MAX_VALUE
  }

  /**
   * Getter for PAD_SIZE for use by descendant classes
   */
  get PAD_SIZE () {
    return PAD_SIZE
  }

  /**
   * Getter for DECIMAL_PLACES for use by descendant classes
   */
  get DECIMAL_PLACES () {
    return DECIMAL_PLACES
  }

  /**
   * Create an index by price for a side of the market
   * @param  {sublevel} store    Store with the underlying orders
   * @param  {String}   side     Side of the market to index (i.e. `BID` or `ASK`)
   * @return {PriceIndex}
   */
  constructor (store, side) {
    super(store, side)
    this.side = side
    this.getValue = this._getValue.bind(this)
    this.filter = this._filter.bind(this)
  }

  /**
   * Filter out orders that are not from this side of the market
   * @param  {String} key   Key of the order to store
   * @param  {String} value Value of the order to store
   * @return {Boolean}      Whether this order should be included in the index
   */
  _filter (key, value) {
    const order = MarketEventOrder.fromStorage(key, value)
    return order.side === this.side
  }

  /**
   * Get index values for the order being stored
   * @param  {String} key   Key of the order to store
   * @param  {String} value Value of the order to store
   * @return {String}       Index value for the order
   */
  _getValue (key, value) {
    const order = MarketEventOrder.fromStorage(key, value)

    return this.keyForPrice(order.price)
  }

  /**
   * Placeholder for implementations of the price index
   * @param  {String} price Decimal of the price
   * @return {String}       Index key to be used
   */
  keyForPrice (price) {
    throw new Error('`keyForPrice` must be implemented by child classes.')
  }

  /**
   * create a read stream of orders with prices at least as good as the given on
   * @param  {String} price Decimal of the price
   * @return {ReadableStream}       ReadableStream from sublevel-index
   */
  streamOrdersAtPriceOrBetter (price) {
    return this.createReadStream({
      lte: this.keyForPrice(price)
    })
  }
}

module.exports = PriceIndex
