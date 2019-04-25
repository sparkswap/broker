const PriceIndex = require('./price-index')
const { Big } = require('../utils')
const { MarketEventOrder } = require('../models')

/**
 * Largest int64, also the maximum value of prices and amounts
 * @constant
 * @type {string}
 * @default
 */
const MAX_VALUE = '9223372036854775807'

/**
 * Total size of keys for price-based indexes, indicating 16 digits to the left and right of the decimal
 * Used for zero-filling so we can lexicographically sort correctly
 * @constant
 * @type {number}
 * @default
 */
const PAD_SIZE = 40
/**
 * Number of decimal places all keys should have
 * @constant
 * @type {number}
 * @default
 */
const DECIMAL_PLACES = 19

/**
 * @class Index Bid orders in a market
 */
class BidIndex extends PriceIndex {
  /**
   * Create an index for bid orders in an underlying store
   * @param  {sublevel} store - Underlying store with the orders
   */
  constructor (store) {
    super(store, MarketEventOrder.SIDES.BID)
  }

  /**
   * Get the index key prefix for a given price
   * Bids are sorted with highest prices first, so they are subtracted from max value
   * So that they can be streamed in order.
   * @param {string} price - Decimal string representation of the price
   * @returns {string} Key to be used as a prefix in the store
   */
  keyForPrice (price) {
    return Big(MAX_VALUE).minus(Big(price)).toFixed(DECIMAL_PLACES).padStart(PAD_SIZE, '0')
  }
}

module.exports = BidIndex
