const logger = require('./logger')
const delay = require('./delay')

/**
 * Max attempts for retries during exponential backoff
 *
 * @constant
 * @type {number}
 * @default
 */
const RETRY_ATTEMPTS = 24

/**
 * Delay, in milliseconds, for each retry attempt
 *
 * @constant
 * @type {number} milliseconds
 * @default
 */
const DELAY = 5000

/**
 * Calls a function repeatedly until success or throws if it fails on final retry
 *
 * @param {Function} callFunction - function to be called
 * @param {string} message - error message to display
 * @param {number} attempts - number of retry attempts left
 * @param {number} delayTime - in milliseconds between calls
 * @returns {Promise}
 */
async function retry (callFunction, message, attempts = RETRY_ATTEMPTS, delayTime = DELAY) {
  try {
    var res = await callFunction()
  } catch (error) {
    if (attempts > 0) {
      const attemptsLeft = attempts - 1

      if (message) {
        logger.error(message, { delayTime: Math.round(delayTime / 1000), attemptsLeft })
      } else {
        logger.error(`Error calling ${callFunction.name}. Retrying in ${Math.round(delayTime / 1000)} seconds, attempts left: ${attemptsLeft}`)
      }

      await delay(delayTime)
      res = await retry(callFunction, message, attemptsLeft, delayTime)
    } else {
      throw new Error(error, `Error with ${callFunction}, no retry attempts left`)
    }
  }
  return res
}

module.exports = retry
