const logger = require('./logger')
const delay = require('./delay')

/**
 * How much to delay each retry by
 *
 * @constant
 * @type {Integer} milliseconds
 * @default
 */
const DELAY_MULTIPLIER = 1.5

/**
 * Max attempts for retries during exponential backoff
 *
 * @constant
 * @type {String}
 * @default
 */
const EXPONENTIAL_BACKOFF_ATTEMPTS = 24

/**
 * Delay, in milliseconds, for each retry attempt
 *
 * @constant
 * @type {Integer} milliseconds
 * @default
 */
const EXPONENTIAL_BACKOFF_DELAY = 5000

/**
 * Calls a function repeatedly until success or throws if it fails on final retry
 *
 * @param {Function} function - to be called
 * @param {Integer} attempts - left
 * @param {Integer} delayTime - in milliseconds between calls
 * @param {Object} logOptions - if you want to pass information to log in the error log

 * @return {Promise}
 */
async function exponentialBackoff (callFunction, attempts = EXPONENTIAL_BACKOFF_ATTEMPTS, delayTime = EXPONENTIAL_BACKOFF_DELAY, logOptions = {}) {
  try {
    var res = await callFunction()
  } catch (error) {
    if (attempts > 0) {
      const attemptsLeft = attempts - 1
      logger.error(`Error calling ${callFunction}. Retrying in ${delayTime / 1000} seconds, attempts left: ${attemptsLeft}`, logOptions)
      await delay(delayTime)
      res = await exponentialBackoff(callFunction, attemptsLeft, delayTime * DELAY_MULTIPLIER, logOptions)
    } else {
      throw new Error(error, `Error with ${callFunction}, no retry attempts left`)
    }
  }
  return res
}

module.exports = exponentialBackoff
