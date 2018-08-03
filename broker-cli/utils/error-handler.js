
/**
 * Takes in an error object and throws a friendly error if the broker daemon is down
 *
 * @param {Error} error
 * @param {Logger} logger
 * @return {void}
 */

function handleError (error, logger) {
  if (error.message === '14 UNAVAILABLE: Connect Failed') {
    logger.error('Broker Daemon is unavailable, you may want to check if it\'s still up.')
  } else {
    logger.error(error)
  }
}
module.exports = handleError
