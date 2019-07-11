const { SublevelIndex } = require('../utils')
const { MarketEventOrder } = require('../models')

/** @typedef {import('level-sublevel')} Sublevel */

/**
 * @class Index by price for a side of the market
 */
class PriceIndex extends SublevelIndex {
  /**
   * Create an index by price for a side of the market
   * @param {Sublevel} store    - Store with the underlying orders
   * @param {string}   side     - Side of the market to index (i.e. `BID` or `ASK`)
   */
  constructor (store, side) {
    // @ts-ignore
    super(store, side)
    this.side = side
    this.getValue = this._getValue.bind(this)
    this.filter = this._filter.bind(this)
  }

  /**
   * Filter out orders that are not from this side of the market
   * @param {string} key   - Key of the order to store
   * @param {string} value - Value of the order to store
   * @returns {boolean}      Whether this order should be included in the index
   */
  _filter (key, value) {
    const order = MarketEventOrder.fromStorage(key, value)
    return order.side === this.side
  }

  /**
   * Get index values for the order being stored
   * @param {string} key   - Key of the order to store
   * @param {string} value - Value of the order to store
   * @returns {string}       Index value for the order
   */
  _getValue (key, value) {
    const order = MarketEventOrder.fromStorage(key, value)

    return this.keyForPrice(order.quantumPrice)
  }

  /**
   * Placeholder for implementations of the price index
   * @param {string} _quantumPrice - Decimal of the quantumPrice
   * @returns {string}
   * @throws {Error} keyForPrice must be implemented by child class
   */
  keyForPrice (_quantumPrice) {
    if (_quantumPrice || !_quantumPrice) {
      throw new Error('`keyForPrice` must be implemented by child classes.')
    }
    return ''
  }

  /**
   * Create a read stream of orders with prices at least as good as the given one
   * Note: If no quantumPrice is provided, creates a read stream of all records
   * @param {?string} quantumPrice - Decimal of the price
   * @returns {Sublevel}
   */
  streamOrdersAtPriceOrBetter (quantumPrice) {
    const opts = {}

    if (quantumPrice) {
      opts.lte = this.keyForPrice(quantumPrice)
    }
    return this.createReadStream(opts)
  }
}

module.exports = PriceIndex
