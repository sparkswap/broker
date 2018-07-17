const { Big } = require('./big')

// This is temporarily hardcoded until we have enough data to use our own interal exchange rates
// TODO fix this conversion once we figure out the problem with LTC max channel balance
const MARKET_CONVERSION = {
  'BTC/LTC': 1
}

/**
 * @function
 * @param {String} balance to convert
 * @param {String} currency the currency that the balance is in
 * @param {String} currencyToConvertTo the currency to convert to
 * @return {String} balance in the currencyToConvertTo
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
