
/**
 * Prevents code execution for a designated amount of milliseconds
 *
 * @param {number} ms - milliseconds
 * @returns {Promise<void>}
 */

function delay (ms) {
  return new Promise((resolve, reject) => {
    void reject
    setTimeout(resolve, ms)
  })
}

module.exports = delay
