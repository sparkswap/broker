/**
 * Default time, in milliseconds, for the cached call to live. Calls
 * made after this time will make another call to the promise function.
 * @constant
 * @type {number}
 * @default
 */
const CACHE_TTL = 5000

/**
 * Initial value for time of last call.
 * @constant
 * @type {number}
 * @default
 */
const INITIAL_LAST_CALL_TIME = 0

/**
 * @class Create a wrapper for a call to a function that returns a promise.
 * Subsequent calls to the function will return the cached result if the
 * previous call is within the time to live.
 */
class CachedCall {
  /**
   * Create a new CachedCall instance.
   * @param {Function} promiseFn - function that returns a promise
   * @param {number} ttl - milliseconds for previous calls to remain valid
   * @returns {CachedCall}
   */
  constructor (promiseFn, ttl = CACHE_TTL) {
    this.promiseFn = promiseFn
    this.lastCallTime = INITIAL_LAST_CALL_TIME
    // Promise returned from the call to `promiseFn`
    this.lastCallPromise = null
    this.ttl = ttl
  }

  /**
   * Attempts calling the promise function. If cached results from previous
   * call are valid, returns the promise from the previous call.
   * @returns {Promise}
   */
  tryCall () {
    if (this.isCached()) {
      return this.lastCallPromise
    }

    this.lastCallTime = Date.now()
    this.lastCallPromise = this.promiseFn()

    return this.lastCallPromise
  }

  /**
   * Returns true if a previous call to the function is a valid cached promise.
   * @returns {boolean}
   */
  isCached () {
    return (this.lastCallTime + this.ttl) > Date.now()
  }
}

module.exports = CachedCall
