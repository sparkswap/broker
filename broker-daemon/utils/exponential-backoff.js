const { logger } = require('./logger')

function exponentialBackoff (callFunction, attempts, delay) {
  callFunction()
    .catch(function (error) {
      logger.error(error)
    })
    .then((res) => {
      if (res) {
        return res
      } else {
        if (attempts > 0) {
          setTimeout(function () {
            exponentialBackoff(callFunction, --attempts, delay * 2)
          }, delay)
        } else {
          logger.error(`${callFunction} failed`)
        }
      }
    })
}

module.exports = exponentialBackoff
