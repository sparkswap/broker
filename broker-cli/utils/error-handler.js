require('colors')
/**
 * Takes in an error object and throws a friendly error if the broker daemon is down
 *
 * @param {Error} error
 * @return {void}
 */
function handleError (error) {
  if (error.message === '14 UNAVAILABLE: Connect Failed') {
    return 'Broker Daemon is unavailable'.red + ', you may want to check if it\'s still up.'
  } else if (error.code === 13) {
    return `Broker Daemon encountered an Internal Error: ${error.details} `.red +
      '\nCheck your Broker Daemon logs (`docker-compose logs -f sparkswapd`) for more information.'
  } else {
    return error
  }
}
module.exports = handleError
