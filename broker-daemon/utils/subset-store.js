const migrateStore = require('./migrate-store')
const logger = require('./logger')

/**
 * @class Subset of another sublevel store
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
   * @public
   * @returns {void} resolves when the index is rebuilt and ready for new events
   */
  async ensureIndex () {
    logger.debug(`Rebuilding ${this.constructor.name} index...`)
    await this.clearIndex()
    await this.rebuildIndex()
    this.addIndexHook()
    logger.debug(`${this.constructor.name} index rebuilt.`)
  }

  /**
   * Create an object that can be passed to Sublevel to create or remove a record
   * In this abstract class, all records will be added to the subset. It should be overwritten by implementers.
   * @private
   * @param {string} key   - Key of the record to create an index op for
   * @param {string} value - Value of the record being added to the events store to create an index op for
   * @returns {Object} object for create/delete for use with sublevel
   */
  addToIndexOperation (key, value) {
    logger.warn(`SubsetStore#addToIndexOperation was called with its default function. ` +
      `This is almost certainly not intended behavior. Override #addToIndexOperation in ` +
      `the sub-class ${this.constructor.name} to only include certain records in the subset.`)
    return { key, value, type: 'put', prefix: this.store }
  }

  /**
   * Clear the existing index
   * @private
   * @returns {Promise} resolves when the index is cleared
   */
  clearIndex () {
    // remove any previously applied hooks
    if (this.removeHook) {
      this.removeHook()
    }
    return migrateStore(this.store, this.store, (key) => { return { type: 'del', key } })
  }

  /**
   * Rebuild the index from events
   * @private
   * @returns {Promise} resolves when the index is rebuilt
   */
  rebuildIndex () {
    return migrateStore(this.sourceStore, this.store, this.addToIndexOperation.bind(this))
  }

  /**
   * Create a hook for new events added to the store to modify the orderbook
   * @private
   * @returns {void}
   */
  addIndexHook () {
    const indexHook = (dbOperation, add) => {
      if (dbOperation.type === 'put') {
        add(this.addToIndexOperation(dbOperation.key, dbOperation.value))
      } else if (dbOperation.type === 'del') {
        add({ key: dbOperation.key, type: 'del', prefix: this.store })
      }
    }

    // `.pre` adds a hook for before a `put` in the sourceStore, and returns
    // a function to remove that same hook.
    this.removeHook = this.sourceStore.pre(indexHook)
  }
}

module.exports = SubsetStore
