require('colors')
const { status } = require('grpc')

/**
 * Takes in an error object and throws a friendly error if the broker daemon is down
 *
 * @param {Error} error
 * @return {void}
 */
function handleError (error) {
  if (error.code === status.UNAVAILABLE) {
    return 'Broker Daemon is unavailable'.red + ', you may want to check if it\'s still up.'
  } else if (error.code === status.INTERNAL) {
    return `Broker Daemon encountered an Internal Error: ${error.details} `.red +
      '\nCheck your Broker Daemon logs (`docker-compose logs -f sparkswapd`) for more information.'
  } else {
    return error
  }
}
module.exports = handleError
