const logger = require('./logger')
const delay = require('./delay')

/**
 * Calls a function repeatedly until success or throws if it fails on final retry
 *
 * @param {Function} function to be called
 * @param {Integer} attempts left
 * @param {Integer} delayTime in milliseconds between calls

 * @return {Promise}
 */
async function exponentialBackoff (callFunction, attempts, delayTime) {
  try {
    var res = await callFunction()
  } catch (error) {
    logger.error(`Error with ${callFunction}, retry attempts left: ${attempts}, error: ${error}`)
    if (attempts > 0) {
      await delay(delayTime)
      res = await exponentialBackoff(callFunction, --attempts, delayTime * 2)
    } else {
      throw new Error(error, `Error with ${callFunction}, no retry attempts left`)
    }
  }
  return res
}

module.exports = exponentialBackoff
