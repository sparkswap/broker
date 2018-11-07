const logger = require('./logger')
const delay = require('./delay')

/**
 * How much to delay each retry by
 *
 * @constant
 * @type {Integer} milliseconds
 */
const DELAY_MULTIPLIER = 1.5
/**
 * Calls a function repeatedly until success or throws if it fails on final retry
 *
 * @param {Function} function to be called
 * @param {Integer} attempts left
 * @param {Integer} delayTime in milliseconds between calls
 * @param {Object} logOptions if you want to pass information to log in the error log


 * @return {Promise}
 */
async function exponentialBackoff (callFunction, attempts, delayTime, logOptions = {}) {
  try {
    var res = await callFunction()
  } catch (error) {
    if (attempts > 0) {
      logger.error(`Error calling ${callFunction}. Retrying in ${delayTime / 1000} seconds, attempts left: ${attempts - 1}`, logOptions)
      await delay(delayTime)
      res = await exponentialBackoff(callFunction, --attempts, delayTime * DELAY_MULTIPLIER)
    } else {
      throw new Error(error, `Error with ${callFunction}, no retry attempts left`)
    }
  }
  return res
}

module.exports = exponentialBackoff
