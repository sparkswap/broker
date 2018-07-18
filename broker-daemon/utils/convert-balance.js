const { Big } = require('./big')

/**
 * @constant
 * @type {Object}
 * @default
 */
const MARKET_CONVERSION = {
  // This is a fixed rate/constraint that is hardcoded in LND
  // see: https://github.com/lightningnetwork/lnd/blob/b0288d46773ac6d45e5dc4d5e6a80dd3034d0b9f/chainregistry.go#L51
  'BTC/LTC': 60
}

/**
 * @function
 * @param {String} balance - int64 balance in the `currency` smallest unit e.g. satoshis
 * @param {String} currency - currency symbol
 * @param {String} currencyToConvertTo - symbol to convert to
 * @return {String} int64 string in the `currnecyToConvertTo` smallest unit e.g. litoshis
 */
function convertBalance (balance, currency, currencyToConvertTo) {
  let multiplier

  if (MARKET_CONVERSION.hasOwnProperty(`${currency}/${currencyToConvertTo}`)) {
    multiplier = MARKET_CONVERSION[`${currency}/${currencyToConvertTo}`]
  } else if (MARKET_CONVERSION.hasOwnProperty(`${currencyToConvertTo}/${currency}`)) {
    multiplier = 1 / MARKET_CONVERSION[`${currencyToConvertTo}/${currency}`]
  } else {
    throw Error(`Market ${currency}/${currencyToConvertTo} is not currently supported`)
  }

  return Big(balance).times(multiplier).toString()
}

module.exports = convertBalance
