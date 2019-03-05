const { MarketEvent, MarketEventOrder } = require('../models')
const { migrateStore } = require('../utils')

/**
 * @class Index of active orders based on events received from the Relayer
 */
class OrderbookIndex {
  /**
   * Create a new index from a base store and a store of Market Events
   * @param {sublevel} store      - Base store to sublevel from
   * @param {sublevel} eventStore - Store of MarketEvents to index
   * @param {string} marketName   - Name of the market to index
   */
  constructor (store, eventStore, marketName) {
    this.store = store.sublevel('orderbook')
    this.eventStore = eventStore
    this.marketName = marketName
  }

  /**
   * Rebuild the index and add hooks for new events
   * @returns {void} resolves when the index is rebuilt and ready for new events
   */
  async ensureIndex () {
    await this._clearIndex()
    await this._rebuildIndex()
    this._addIndexHook()
  }

  /**
   * Create an object that can be passed to Sublevel to create or remove an orderbook record
   * @param {string} key   - Key of the record to create an index op for
   * @param {string} value - Value of the record being added to the events store to create an index op for
   * @returns {Object} object for create/delete for use with sublevel
   */
  _addToIndexOperation (key, value) {
    const event = MarketEvent.fromStorage(key, value)
    const order = MarketEventOrder.fromEvent(event, this.marketName)

    if (event.eventType === MarketEvent.TYPES.PLACED) {
      return { key: order.key, value: order.value, type: 'put', prefix: this.store }
    }

    return { key: order.key, type: 'del', prefix: this.store }
  }

  /**
   * Clear the existing index
   * @returns {Promise} resolves when the index is cleared
   */
  _clearIndex () {
    // remove any previously applied hooks
    if (this._removeHook) {
      this._removeHook()
    }
    return migrateStore(this.store, this.store, (key) => { return { type: 'del', key } })
  }

  /**
   * Rebuild the index from events
   * @returns {Promise} resolves when the index is rebuilt
   */
  _rebuildIndex () {
    return migrateStore(this.eventStore, this.store, this._addToIndexOperation.bind(this))
  }

  /**
   * Create a hook for new events added to the store to modify the orderbook
   * @returns {void}
   */
  _addIndexHook () {
    const indexHook = (dbOperation, add) => {
      if (dbOperation.type !== 'put') {
        return
      }

      add(this._addToIndexOperation(dbOperation.key, dbOperation.value))
    }

    // `.pre` adds a hook for before a `put` in the eventStore, and returns
    // a function to remove that same hook.
    this._removeHook = this.eventStore.pre(indexHook)
  }
}

module.exports = OrderbookIndex
