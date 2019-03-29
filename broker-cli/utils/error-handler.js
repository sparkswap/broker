require('colors')
const { status } = require('grpc')

/**
 * String to match errors for unregistered entity IDs on the Relayer.
 * @constant
 * @type {string}
 */
const NOT_REGISTERED_ERROR = 'not registered'

/**
 * Takes in an error object and throws a friendly error if the broker daemon is down
 *
 * @param {Error} error
 * @returns {string}
 */
function handleError (error) {
  if (error.code === status.UNAVAILABLE) {
    return 'Broker Daemon is unavailable'.red + ', you may want to check if it\'s still up.'
  } else if (error.code === status.INTERNAL) {
    return handleInternalError(error)
  } else {
    return error
  }
}

/**
 * Handling for internal error messages. Adds action item for user if Relayer encounters an unregistered Broker.
 *
 * @param {Error} error
 * @returns {string}
 */
function handleInternalError (error) {
  let message = `Broker Daemon encountered an Internal Error: ${error.details} `.red +
    '\nCheck your Broker Daemon logs (`docker-compose logs -f sparkswapd`) for more information.'

  if (error.details.includes(NOT_REGISTERED_ERROR)) {
    message += '\nPlease run `sparkswap register` to register your Broker Daemon with the Relayer.'
  }
  return message
}
module.exports = handleError
