const PriceIndex = require('./price-index')
const { MarketEventOrder } = require('../models')
const { Big } = require('../utils')

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
 * @class Index Ask orders in a market
 */
class AskIndex extends PriceIndex {
  /**
   * Create an index for ask orders in an underlying store
   * @param  {sublevel} store Underlying store with the orders
   * @return {AskIndex}
   */
  constructor (store) {
    super(store, MarketEventOrder.SIDES.ASK)
  }

  /**
   * Get the index key prefix for a given price
   * Asks are sorted so that the lowest price comes first
   * @param  {String} price Decimal string representation of the price
   * @return {String}       Key to be used as a prefix in the store
   */
  keyForPrice (price) {
    return Big(price).toFixed(DECIMAL_PLACES).padStart(PAD_SIZE, '0')
  }
}

module.exports = AskIndex
