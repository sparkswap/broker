const isInt = require('validator/lib/isInt')
const isAlpha = require('validator/lib/isAlpha')
const isUrl = require('validator/lib/isUrl')

/**
 * Checks if the specified string is a valid price for kinesis
 *
 * @param {String} str
 */
function isPrice (str) {
  return isInt(str, { lt: 99999 })
}

/**
 * Checks the provided marketName's length. Assumes that marketName is a string
 *
 * @param {String} marketName
 */
function validMarketNameLength (marketName) {
  return (marketName.length >= 2 && marketName.length <= 5)
}

function isMarketName (str) {
  try {
    const [base, counter] = str.split('/')

    return (
      isAlpha(base) &&
      validMarketNameLength(base) &&
      isAlpha(counter) &&
      validMarketNameLength(counter)
    )
  } catch (e) {
    return false
  }
}

function isRPCHost (str) {
  return isUrl(str, {
    // We can disable this for now because we use URLs that are local to the container
    // However, we should remove this in the future to be more strict in our input checking
    require_valid_protocol: false,
    require_tld: false
  })
}

module.exports = {
  isPrice,
  isMarketName,
  isRPCHost
}
