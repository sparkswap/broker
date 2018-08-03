
/**
 * Takes in an error object and throws a friendly error if the broker daemon is down
 *
 * @param {Error} error
 * @return {void}
 */

function handleError (error) {
  if (error.message === '14 UNAVAILABLE: Connect Failed') {
    return 'Broker Daemon is unavailable, you may want to check if it\'s still up.'
  } else {
    return error
  }
}
module.exports = handleError
