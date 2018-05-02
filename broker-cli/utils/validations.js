const { isInt, isAlpha, isURL } = require('validator')

/**
 * Checks if the specified string is a valid price for kinesis
 *
 * @param {String} str
 * @returns {String} validated price
 * @throws {Error} returns an error if price is not a valid format
 */
function isPrice (str) {
  if (isInt(str, { lt: 99999 })) {
    return str
  }
  throw new Error('Invalid Price Format')
}

/**
 * Checks the provided marketName's length
 *
 * @param {String} marketName
 * @returns {Bool} returns true if specified market name is valid
 */
function validMarketNameLength (marketName) {
  return (marketName.length >= 2 && marketName.length <= 5)
}

/**
 * Provides type and length checking for a market name
 *
 * @param {String} str - potential market name
 * @returns {String} validated market name
 * @throws {Error} returns an error if marketname is not valid
 */
function isMarketName (str) {
  try {
    const [base, counter] = str.split('/')

    if (
      isAlpha(base) &&
      validMarketNameLength(base) &&
      isAlpha(counter) &&
      validMarketNameLength(counter)
    ) {
      return str
    }

    throw new Error()
  } catch (e) {
    throw new Error('Market Name format is incorrect')
  }
}

/**
 * Checks if a specified string is a valid RPC host.
 *
 * @param {String} str - rpc host address
 * @returns {String}
 * @throws {Error} returns an error if the given string is invalid for an RPC host
 */
function isRPCHost (str) {
  // We can disable the `valid_protocol` and `tld` options for now because we use URLs
  // that are local to the container. However, we should remove this in the future to
  // be more strict in our input checking
  if (isURL(str, {
    require_valid_protocol: false,
    require_tld: false
  })) {
    return str
  }

  throw new Error('Invalid RPC Host name')
}

module.exports = {
  isPrice,
  isMarketName,
  isRPCHost
}
