const { SublevelIndex } = require('../utils')
const { MarketEventOrder } = require('../models')

/**
 * @class Index by price for a side of the market
 */
class PriceIndex extends SublevelIndex {
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
    const opts = {}

    if (price) {
      opts.lte = this.keyForPrice(price)
    }
    return this.createReadStream(opts)
  }
}

module.exports = PriceIndex
