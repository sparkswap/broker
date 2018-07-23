/**
 * Get the current timestamp in seconds
 * @return {Number} Current timestamp in seconds
 */
function nowInSeconds () {
  // JS uses milliseconds from Date.now, so we round to the nearest second
  return Math.round(Date.now() / 1000)
}

module.exports = nowInSeconds
