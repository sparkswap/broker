const PriceIndex = require('./price-index')
const { MarketEventOrder } = require('../models')

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
    const { PAD_SIZE } = this
    return price.padStart(PAD_SIZE, '0')
  }
}

module.exports = AskIndex
