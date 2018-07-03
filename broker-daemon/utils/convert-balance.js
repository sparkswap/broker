const MARKET_CONVERSION = {
  'BTC/LTC': 79.612,
  'LTC/BTC': 0.01257
}

/**
 * @function
 * @param {Integer} balance to convert
 * @param {String} currency the currency that the balance is in
 * @param {String} currencyToConvertTo the currency to convert to
 * @return {Integer} balance in the counter currency
 */
function convertBalance (balance, currency, currencyToConvertTo) {
  return balance.times(MARKET_CONVERSION[`${currency}/${currencyToConvertTo}`])
}

module.exports = convertBalance
