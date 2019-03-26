const { isInt, isAlpha, isURL, isDecimal: validatorIsDecimal, matches } = require('validator')
const { Big } = require('./big')
require('colors')

class ValidationError extends Error {
  constructor (...args) {
    super(...args)
    this.message = this.message.red
  }
}

/**
 * Largest int64 is our maximum value for amounts
 * @constant
 * @type {string}
 * @default
 */
const MAX_VALUE = '9223372036854775807'

/**
 * @constant
 * @type {Object}
 * @default
 */
const BLOCKCHAIN_NETWORKS = Object.freeze([
  'mainnet',
  'testnet',
  'regtest'
])

/**
 * Checks if the specified string is a valid decimal format
 *
 * @param {string} str
 * @returns {string} validated decimal
 * @throws {Error} returns an error if decimal is not a valid format
 */
function isDecimal (str) {
  if ((validatorIsDecimal(str, { decimal_places: '1,19' }) || isInt(str)) && Big(str).lte(MAX_VALUE)) {
    return str
  }

  throw new ValidationError('Invalid decimal format')
}

/**
 * Checks the provided marketName's length
 *
 * @param {string} marketName
 * @returns {Bool} returns true if specified market name is valid
 */
function validMarketNameLength (marketName) {
  return (marketName.length >= 2 && marketName.length <= 5)
}

/**
 * Provides type and length checking for a market name
 *
 * @param {string} str - potential market name
 * @returns {string} validated market name
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
      return str.toUpperCase()
    }

    throw new Error('[empty error to trigger the catch]')
  } catch (e) {
    throw new ValidationError(`Market Name should be specified with '--market <marketName>', where <marketName> is the base and counter symbols separated by a '/' e.g. 'BTC/LTC'`)
  }
}

/**
 * Checks the provided list of marketnames lengths
 *
 * @param {string} marketNames - comma separated
 * @returns {Bool} returns true if all market names are valid
 */
function validMarketNames (marketNames) {
  return marketNames.split(',').every(isMarketName)
}

/**
 * Checks the provided list of marketnames lengths
 *
 * @param {string} marketNames - comma separated
 * @returns {string} returns string if all market names are valid
 * @throws {Error} returns an error if not all marketnames are valid
 */
function areValidMarketNames (marketNames) {
  try {
    if (marketNames === '' || validMarketNames(marketNames)) {
      return marketNames
    }
  } catch (e) {
    throw new ValidationError('One or more market names is invalid')
  }
}

/**
 * Checks if a specified string is a valid host.
 *
 * @param {string} str - host address
 * @returns {string}
 * @throws {Error} returns an error if the given string is invalid for an host
 */
function isHost (str) {
  // We can disable the `valid_protocol`, `tld` options and enable `allow_underscores`
  // for now because we use URLs that are local to the container.
  // However, we should remove this in the future to be more strict in our input checking
  if (isURL(str, {
    require_valid_protocol: false,
    require_tld: false,
    allow_underscores: true
  })) {
    return str
  }

  throw new ValidationError('Invalid address')
}

/**
 * Checks if a specified string is a valid path.
 *
 * @param {String} str - path to file
 * @returns {String} the path
 * @throws {Error} returns an error if the given string is not a valid path
 */
// TODO: better path checking
function isFormattedPath (str) {
  if (matches(str, /^.+$/)) {
    return str
  }

  throw new ValidationError('Path format is incorrect')
}

/**
 * Checks if a specified string is a valid block order id.
 *
 * @param  {string}  str - block order id
 * @returns {string}     block order id
 * @throws {Error} If string contains more than the allowed characters
 */
function isBlockOrderId (str) {
  if (matches(str, /^[a-zA-Z0-9_-]+$/)) {
    return str
  }

  throw new ValidationError('Block order IDs only contain upper and lower case letters, numbers, dashes (-) and underscores (_).')
}

/**
 * Checks if a specified string is a valid date.
 *
 * @param  {string}  str - date
 * @returns {string}  str - date
 * @throws {Error} If string cannot be parsed into a date
 */
function isDate (str) {
  if (new Date(str) !== 'Invalid Date' && !isNaN(new Date(str))) {
    if (str === new Date(str).toISOString()) {
      return str
    }
  }

  throw new ValidationError('Given datetime is not in a valid date format')
}

/**
 * Checks if a specified string is a limit
 *
 * @param  {string}  str - limit
 * @returns {string}  str - limit
 * @throws {Error} If string is not a valid integer
 */
function isPositiveInteger (str) {
  if (/^\+?[1-9][\d]*$/.test(str)) {
    return str
  }

  throw new ValidationError('Not a valid integer value')
}

/**
 * Checks if the given network is a valid blockchain network
 * for the broker
 * @param {string} network - blockchain network
 * @returns {string}
 * @throws {Error} Invalid network
 */
function isBlockchainNetwork (network) {
  if (BLOCKCHAIN_NETWORKS.includes(network)) {
    return network
  }

  throw new ValidationError(`Invalid blockchain network: ${network}`)
}

module.exports = {
  isDecimal,
  isMarketName,
  isHost,
  isFormattedPath,
  areValidMarketNames,
  isBlockOrderId,
  isDate,
  isPositiveInteger,
  isBlockchainNetwork
}
