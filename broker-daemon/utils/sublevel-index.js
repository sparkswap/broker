const { promisify } = require('util')
const streamFilter = require('stream-filter')
const { Readable } = require('stream')
const storePipe = require('./store-pipe')
const logger = require('./logger')
const returnTrue = function () { return true }

/**
 * @class Indexed values for sublevel
 */
class Index {
  /**
   * Create a new index for sublevel store
   * @param  {sublevel} store    Sublevel of the base store
   * @param  {String}   name     Name of the index
   * @param  {Function} getValue User-passed function that returns the indexed value
   * @return {Index}
   */
  constructor (store, name, getValue, filter = returnTrue) {
    this.store = store
    this.name = name
    this.getValue = getValue
    this.filter = filter   
    this.delimiter = ':'
    this._deleted = {}
    this._index = this.store.sublevel(this.name)
  }

  /**
   * Create an index
   * @return {Promise<Index>} Resolves when the index is created
   */
  async ensureIndex() {
    await this._clearIndex()
    await this._rebuildIndex()

    this.store.pre((dbOperation, add) => {
      const { key, value, type } = dbOperation

      if(type === 'put' && this.filter(key, value)) {
        add(this._addToIndexOperation(key, value))
      } else if(type === 'del') {
        this._removeFromIndex(key)
      }
    })

    return this
  }

  /**
   * Create a read stream of the index, filtering out those keys marked for deletion
   * @param  {Object} opts Sublevel readStream options
   * @return {Readable}    Readable stream
   */
  async createReadStream(opts) {
    const outstream = new Readable()
    const instream = this._index.createReadStream(opts)

    outstream.pipe(streamFilter.obj(({ key, value }) => {
      return !!this._isMarkedForDeletion(key)
    })).pipe(outstream)

    return outstream
  }

  /**
   * Get the key corresponding to the base store from the index key
   * @param  {String} indexKey Key of the object in the index
   * @return {String}          Key of the object in the base store
   */
  _extractBaseKey (indexKey) {
    const chunks = indexKey.split(this.delimiter)
    return chunks[chunks.length - 1]
  }

  /**
   * Create an index key
   * @param  {String}   baseKey   Key of the object in the base store
   * @param  {String}   baseValue Value of the object in the base store
   * @param  {Function} getValue  
   * @return {String}
   */
  _createIndexKey(baseKey, baseValue) {
    const indexValue = this.getValue(baseKey, baseValue)

    return `${indexValue}${this.delimiter}${baseKey}`
  }

  /**
   * Mark a base key as being deleted in this index
   * @param  {String} baseKey Key of the object in the base store
   * @return {void}
   */
  _markForDeletion (baseKey) {
    this._deleted[baseKey] = true
  }

  /**
   * Mark a base key as deleted from the index
   * @param  {String} baseKey Key of the object in the base store
   * @return {void}
   */
  _markAsDeleted (baseKey) {
    delete this._deleted[baseKey]
  }

  /**
   * Checks whether a given index key will be removed from the index
   * @param  {String}  indexKey Key of the object in the index
   * @return {Boolean}
   */
  _isMarkedForDeletion (indexKey) {
    const baseKey = this._extractBaseKey(indexKey)
    return !!this._deleted[baseKey]
  }

  /**
   * Queue the deletion of a base key from the index
   * @param  {String} baseKey Key of the object in the base store
   * @return {void}
   */
  async _removeFromIndex (baseKey) {
    this._markForDeletion(baseKey)

    this.store.get(baseKey, async (err, value) => {
      if(err) {
        // TODO: error handling on index removal
        return logger.error(`Error while removing ${baseKey} from ${this.name} index`, err)
      }

      try {
        await promisify(this._index.del)(this._createIndexKey(baseKey, value))
        this._markAsDeleted(baseKey)
      } catch(e) {
        // TODO: error handling on index removal
        return logger.error(`Error while removing ${baseKey} from ${this.name} index`, e)
      }
    })
  }

  /**
   * Create a database operation to add an object to the index
   * @param {String}   baseKey    Key of the object in the base store
   * @param {String}   baseValue  Value of the object in the base store
   * @return {Object} Sublevel compatible database batch operation
   */
  async _addToIndexOperation (baseKey, baseValue) {
    const indexKey = this._createIndexKey(baseKey, baseValue)
    return { key: indexKey, value: baseValue, type: 'put', prefix: this._index })
  }

  /**
   * Remove all objects in the index database
   * @return {Promise<void>} Resolves when the database is cleared
   */
  _clearIndex() {
    return storePipe(this._index, this._index, (key) => { type: 'del', key, prefix: this._index })
  }

  /**
   * Rebuild the index from the base
   * @return {Promise<void>} Resolves when the rebuild is complete
   */
  _rebuildIndex() {
    return storePipe(this.store, this._index, (key, value) => {
      if(this.filter(key, value)) {
        return this._addToIndexOperation.bind(this))
      }
    })
  }
}

module.exports = Index
