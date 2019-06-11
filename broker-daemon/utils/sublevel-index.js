const { promisify } = require('util')
const through = require('through2')
const migrateStore = require('./migrate-store')
const logger = require('./logger')

/**
 * Return true for every call
 * Used to create a non-filtering filter
 * @returns {boolean} True for every item passed
 */
const returnTrue = function () { return true }

/**
 * Default key delimiter
 * @constant
 * @type {string}
 * @default
 */
const DELIMITER = ':'

/**
 * Lower bound for leveldb ranged queries
 * @constant
 * @type {string}
 * @default
 */
const LOWER_BOUND = '\x00'

/**
 * Upper bound for leveldb ranged queries
 * @constant
 * @type {string}
 * @default
 */
const UPPER_BOUND = '\uffff'

/**
 * @class Indexed values for sublevel
 */
class Index {
  /**
   * Create a new index for sublevel store
   * @param  {sublevel} store                 - Sublevel of the base store
   * @param  {string}   name                  - Name of the index
   * @param  {Function} getValue              - User-passed function that returns the indexed value
   * @param  {Function} [filter=returnTrue]   - Filter for items to not index
   * @param  {string}   [delimiter=DELIMITER] - Delimiter between the index value and the base key. It may appear in the base key, but cannot appear in the index value produced by `getValue`.
   * @returns {Index}
   */
  constructor (store, name, getValue, filter = returnTrue, delimiter = DELIMITER) {
    this.store = store
    this.name = name
    this.getValue = getValue
    this.filter = filter
    this.delimiter = delimiter
    this._deleted = {}
    this._index = this.store.sublevel(this.name)
  }

  /**
   * Create an index by clearing the sublevel, rebuilding for old objects, and listening for new entries
   * @returns {Promise<Index>} Resolves when the index is created
   */
  async ensureIndex () {
    await this._clearIndex()
    await this._rebuildIndex()
    this._addIndexHook()

    return this
  }

  /**
   * Build a sublevel-compatible option range for this index
   * @param {Object} opts - Options from which to build a range
   * @returns {Object} Sublevel readStream options
   */
  range (opts = {}) {
    if (opts.gt) {
      opts.gt = `${opts.gt}${this.delimiter}${LOWER_BOUND}`
    } else if (opts.gte) {
      opts.gte = `${opts.gte}${this.delimiter}${LOWER_BOUND}`
    }

    if (opts.lt) {
      opts.lt = `${opts.lt}${this.delimiter}${UPPER_BOUND}`
    } else if (opts.lte) {
      opts.lte = `${opts.lte}${this.delimiter}${UPPER_BOUND}`
    }

    return opts
  }

  /**
   * Create a read stream of the index, filtering out those keys marked for deletion and transforming index keys into base keys
   * @param {Object} opts - Sublevel readStream options
   * @returns {Readable}    Readable stream
   */
  createReadStream (opts) {
    const optionsToUpdate = Object.assign({}, opts)
    const updatedOptions = this.range(optionsToUpdate)
    const stream = this._index.createReadStream(updatedOptions)
    // through2 - the lib used below - overrides function context to provide access to `this.push` to push
    // objects into the downstream stream. In order to get access to `#_isMarkedForDeletion`, we need to
    // reference the Index context in a local variable
    const index = this

    return stream.pipe(through.obj(function ({ key, value }, encoding, callback) {
      // skip objects that are marked for deletion
      if (index._isMarkedForDeletion(key)) {
        return callback()
      }

      // give back the base key to the caller
      // Note: `this` is provided by the through library to give access to this function,
      // so we can't use a lambda here
      this.push({ key: index._extractBaseKey(key), value })

      callback()
    }))
  }

  /**
   * Get the key corresponding to the base store from the index key
   * @example
   * // returns 'abc:123'
   * index._extractBaseKey('xyz:abc:123')
   * @example
   * // returns '123'
   * index._extractBaseKey('xyz:123')
   * @param  {string} indexKey - Key of the object in the index
   * @returns {string}          Key of the object in the base store
   */
  _extractBaseKey (indexKey) {
    // in most cases, we will have only two chunks: the indexValue and the baseKey
    // However, if the base key contains `this.delimiter`, we will end up with more.
    // e.g. if the indexKey is `'xyz:abc:123'`, the chunks will be `['xyz', 'abc', '123']`
    const chunks = indexKey.split(this.delimiter)
    // remove the index value, which is the first value that is delimited
    // e.g. `['xyz', 'abc', '123']` => `['abc', '123']`
    const baseKeyChunks = chunks.slice(1)
    // rejoin the remaining chunks in case the base key contained the delimiter
    // e.g. `['abc', '123']` => `abc:123`
    return baseKeyChunks.join(this.delimiter)
  }

  /**
   * Create an index key
   * @example
   * // returns 'xyz:abc'
   * index._createIndexKey('abc', 'xyz')
   * // returns 'xyz:abc:123'
   * index._createIndexKey('abc:123', 'xyz')
   * @param  {string}   baseKey   - Key of the object in the base store
   * @param  {string}   baseValue - Value of the object in the base store
   * @returns {string}
   * @throws {Error} If the derived index value contains `this.delimiter`
   */
  _createIndexKey (baseKey, baseValue) {
    const indexValue = this.getValue(baseKey, baseValue)

    // if the index value were to contain the delimiter, we would have no way
    // of knowing where the index value ends and the base key begins
    if (indexValue && indexValue.indexOf(this.delimiter) !== -1) {
      throw new Error(`Index values cannot contain the delimiter (${this.delimiter}). If your index value requires it, change the delimiter of the index and rebuild it.`)
    }

    return `${indexValue}${this.delimiter}${baseKey}`
  }

  /**
   * Mark a base key as being deleted in this index to avoid it being returned while its being deleted
   * @param  {string} baseKey - Key of the object in the base store
   * @returns {void}
   */
  _startDeletion (baseKey) {
    this._deleted[baseKey] = true
  }

  /**
   * Base key is removed from the index store, so we can remove from our local cache
   * @param  {string} baseKey - Key of the object in the base store
   * @returns {void}
   */
  _finishDeletion (baseKey) {
    delete this._deleted[baseKey]
  }

  /**
   * Checks whether a given index key will be removed from the index
   * @param  {string}  indexKey - Key of the object in the index
   * @returns {boolean}
   */
  _isMarkedForDeletion (indexKey) {
    const baseKey = this._extractBaseKey(indexKey)
    return !!this._deleted[baseKey]
  }

  /**
   * Queue the deletion of a base key from the index
   * @param {string} baseKey - Key of the object in the base store
   * @returns {void}
   */
  _removeFromIndex (baseKey) {
    this._startDeletion(baseKey)

    this.store.get(baseKey, async (err, value) => {
      if (err) {
        // TODO: error handling on index removal
        return logger.error(`Error trying to get key when removing ${baseKey} from ${this.name} index`, { err: err.toString() })
      }

      try {
        if (!this.filter(baseKey, value)) {
          return
        }

        await promisify(this._index.del)(this._createIndexKey(baseKey, value))
        this._finishDeletion(baseKey)
      } catch (e) {
        // TODO: error handling on index removal
        return logger.error(`Error while removing ${baseKey} from ${this.name} index`, { err: e.toString() })
      }
    })
  }

  /**
   * Create a database operation to add an object to the index
   * @param {string}   baseKey    - Key of the object in the base store
   * @param {string}   baseValue  - Value of the object in the base store
   * @returns {Object} Sublevel compatible database batch operation
   */
  _addToIndexOperation (baseKey, baseValue) {
    const indexKey = this._createIndexKey(baseKey, baseValue)
    return { key: indexKey, value: baseValue, type: 'put', prefix: this._index }
  }

  /**
   * Add a hook to the store to add any new items in the base store to the index and
   * remove any objects removed from the base removed from the index
   * @returns {void}
   */
  _addIndexHook () {
    const indexHook = (dbOperation, add) => {
      const { key, value, type } = dbOperation

      if (type === 'put' && this.filter(key, value)) {
        add(this._addToIndexOperation(key, value))
      } else if (type === 'del') {
        this._removeFromIndex(key)
      }
    }

    // `.pre` adds a hook for before a `put` in the `store`, and returns
    // a function to remove that same hook.
    this._removeHook = this.store.pre(indexHook)
  }

  /**
   * Remove all objects in the index database
   * @returns {Promise<void>} Resolves when the database is cleared
   */
  _clearIndex () {
    // reset the hook if it already exists
    if (this._removeHook) {
      this._removeHook()
    }
    return migrateStore(this._index, this._index, (key) => ({ type: 'del', key, prefix: this._index }))
  }

  /**
   * Rebuild the index from the base
   * @returns {Promise<void>} Resolves when the rebuild is complete
   */
  _rebuildIndex () {
    return migrateStore(this.store, this._index, (key, value) => {
      if (this.filter(key, value)) {
        return this._addToIndexOperation(key, value)
      }
    })
  }
}

module.exports = Index
