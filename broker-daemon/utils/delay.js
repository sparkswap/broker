
/**
 * Prevents code execution for a designated amount of milliseconds
 *
 * @param {Integer} milliseconds
 * @return {Promise}
 */

function delay (ms) {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, ms)
  })
}

module.exports = delay
