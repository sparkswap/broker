const PriceIndex = require('./price-index')
const { Big } = require('../utils')
const { MarketEventOrder } = require('../models')

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
    super(store, MarketEventOrder.SIDES.BID)
  }

  /**
   * Get the index key prefix for a given price
   * Bids are sorted with highest prices first, so they are subtracted from max value
   * So that they can be streamed in order.
   * @param  {String} price Decimal string representation of the price
   * @return {String}       Key to be used as a prefix in the store
   */
  keyForPrice (price) {
    const { MAX_VALUE, DECIMAL_PLACES, PAD_SIZE } = this
    return Big(MAX_VALUE).minus(Big(price)).toFixed(DECIMAL_PLACES).padStart(PAD_SIZE, '0')
  }
}

module.exports = BidIndex
