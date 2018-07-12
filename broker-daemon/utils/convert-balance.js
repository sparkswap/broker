
// This is temporarily hardcoded until we have enough data to use our own interal exchange rates
const MARKET_CONVERSION = {
  'BTC/LTC': 79.612
}

/**
 * @function
 * @param {Integer} balance to convert
 * @param {String} currency the currency that the balance is in
 * @param {String} currencyToConvertTo the currency to convert to
 * @return {Integer} balance in the counter currency
 */
function convertBalance (balance, currency, currencyToConvertTo) {
  const market = `${currency}/${currencyToConvertTo}`
  if (MARKET_CONVERSION.hasOwnProperty(`${currency}/${currencyToConvertTo}`)) {
    return balance.times(MARKET_CONVERSION[`${currency}/${currencyToConvertTo}`])
  } else if (MARKET_CONVERSION.hasOwnProperty(`${currencyToConvertTo}/${currency}`)) {
    return balance.times(1 / MARKET_CONVERSION[`${currencyToConvertTo}/${currency}`])
  }

  throw Error(`Market ${market} is not currently supported`)
}

module.exports = convertBalance
