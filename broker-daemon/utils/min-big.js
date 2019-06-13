const Big = require('./big')

/**
 * Find the minimum value of a group of Big.js numbers
 * @param   {...Big} bigs - List of Big.js numbers to compare
 * @returns {string}        Smallest Big.js number in the set
 */
function minBig (...bigs) {
  return bigs.reduce((min, big) => {
    if (Big(min).gt(big)) {
      return big
    }
    return min
  }).toString()
}

module.exports = minBig
