const logger = require('./logger')
const delay = require('./delay')

async function exponentialBackoff (callFunction, attempts, delayTime) {
  try {
    var res = callFunction()
  } catch (error) {
    logger.error(`Error (${error}) with ${callFunction}, retry attempts left: ${attempts}`)
    if (attempts > 0) {
      await delay(delayTime)
      exponentialBackoff(callFunction, --attempts, delayTime * 2)
    } else {
      logger.error(`Error (${error}) with ${callFunction}, no retry attempts left`)
    }
  }
  return res
}

module.exports = exponentialBackoff
