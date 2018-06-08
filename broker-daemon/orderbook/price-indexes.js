const { Big, SublevelIndex } = require('../utils')
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
const PAD_SIZE = 32
/**
 * Number of decimal places all keys should have
 * @constant
 * @default
 * @type {Number}
 */
const DECIMAL_PLACES = 16

/**
 * @class Index by price for a side of the market
 */
class PriceIndex extends SublevelIndex {
  /**
   * Create an index by price for a side of the market
   * @param  {sublevel} store    Store with the underlying orders
   * @param  {String}   side     Side of the market to index (i.e. `BID` or `ASK`)
   * @param  {Function} getValue Function that returns the index value for a given key/value pair
   * @return {PriceIndex}
   */
  constructor (store, side, getValue) {
    super(store, side, getValue, (key, value) => {
      const order = MarketEventOrder.fromStorage(key, value)
      return order.side === side
    })
  }
}

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
    super(store, MarketEventOrder.SIDES.ASK, (key, value) => {
      const order = MarketEventOrder.fromStorage(key, value)
      const price = order.price

      // Asks are sorted so that the lowest price comes first
      return price.padStart(PAD_SIZE, '0')
    })
  }
}

/**
 * @class Index Bid orders in a market
 */
class BidIndex extends PriceIndex {
  /**
   * Create an index for bid orders in an underlying store
   * @param  {sublevel} store Underlying store with the orders
   * @return {BidIndex}
   */
  constructor (store) {
    super(store, MarketEventOrder.SIDES.BID, (key, value) => {
      const order = MarketEventOrder.fromStorage(key, value)
      const price = order.price

      // Bids are sorted with highest prices first
      return Big(MAX_VALUE).minus(Big(price)).toFixed(DECIMAL_PLACES).padStart(PAD_SIZE, '0')
    })
  }
}

module.exports = {
  AskIndex,
  BidIndex
}
