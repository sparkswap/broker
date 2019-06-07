const migrateStore = require('./migrate-store')

/**
 * @class Subset of another sublevel store based on criteria
 */
class SubsetStore {
  /**
   * Create a new subset from a target store and a source store
   * @param {sublevel} targetStore - store to keep the subset in
   * @param {sublevel} sourceStore - Store of records to create a subset of
   */
  constructor (targetStore, sourceStore) {
    this.store = targetStore
    this.sourceStore = sourceStore
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
   * Create an object that can be passed to Sublevel to create or remove a record
   * In this abstract class, all records will be added to the subset. It should be overwritten by implementers.
   * @param {string} key   - Key of the record to create an index op for
   * @param {string} value - Value of the record being added to the events store to create an index op for
   * @returns {Object} object for create/delete for use with sublevel
   */
  _addToIndexOperation (key, value) {
    return { key, value, type: 'put', prefix: this.store }
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
    return migrateStore(this.sourceStore, this.store, this._addToIndexOperation.bind(this))
  }

  /**
   * Create a hook for new events added to the store to modify the orderbook
   * @returns {void}
   */
  _addIndexHook () {
    const indexHook = (dbOperation, add) => {
      if (dbOperation.type === 'put') {
        add(this._addToIndexOperation(dbOperation.key, dbOperation.value))
      } else if (dbOperation.type === 'del') {
        add({ key: dbOperation.key, type: 'del', prefix: this.store })
      }
    }

    // `.pre` adds a hook for before a `put` in the sourceStore, and returns
    // a function to remove that same hook.
    this._removeHook = this.sourceStore.pre(indexHook)
  }
}

module.exports = SubsetStore
