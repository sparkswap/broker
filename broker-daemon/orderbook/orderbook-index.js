const { MarketEvent, MarketEventOrder } = require('../models')
const { SubsetStore } = require('../utils')

/** @typedef {import('level-sublevel')} Sublevel */

/**
 * @class Index of active orders based on events received from the Relayer
 */
class OrderbookIndex extends SubsetStore {
  /**
   * Create a new index from a base store and a store of Market Events
   * @param {Sublevel} store      - Base store to sublevel from
   * @param {Sublevel} eventStore - Store of MarketEvents to index
   * @param {string} marketName   - Name of the market to index
   */
  constructor (store, eventStore, marketName) {
    super(store.sublevel('orderbook'), eventStore)
    this.marketName = marketName
  }

  /**
   * Create an object that can be passed to Sublevel to create or remove an orderbook record
   * @private
   * @param {string} key   - Key of the record to create an index op for
   * @param {string} value - Value of the record being added to the events store to create an index op for
   * @returns {Object} object for create/delete for use with sublevel
   */
  addToIndexOperation (key, value) {
    const event = MarketEvent.fromStorage(key, value)
    const order = MarketEventOrder.fromEvent(event, this.marketName)

    if (event.eventType === MarketEvent.TYPES.PLACED) {
      return { key: order.key, value: order.value, type: 'put', prefix: this.store }
    }

    return { key: order.key, type: 'del', prefix: this.store }
  }
}

module.exports = OrderbookIndex
