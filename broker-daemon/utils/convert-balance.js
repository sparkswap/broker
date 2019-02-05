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
 * Given a balance and currency conversion symbols, we return a converted balance.
 *
 * NOTE: We round all balances down to avoid returning a balance too large for
 *       channel opening.
 *
 * @function
 * @param {string} balance - int64 balance in the `currency` smallest unit (e.g. satoshis)
 * @param {string} currency - currency symbol
 * @param {string} currencyToConvertTo - symbol to convert to
 * @return {string} int64 string in the `currencyToConvertTo` smallest unit (e.g. litoshis)
 */
function convertBalance (balance, currency, currencyToConvertTo) {
  let multiplier

  if (MARKET_CONVERSION.hasOwnProperty(`${currency}/${currencyToConvertTo}`)) {
    multiplier = Big(MARKET_CONVERSION[`${currency}/${currencyToConvertTo}`])
  } else if (MARKET_CONVERSION.hasOwnProperty(`${currencyToConvertTo}/${currency}`)) {
    multiplier = Big(1).div(MARKET_CONVERSION[`${currencyToConvertTo}/${currency}`])
  } else {
    throw Error(`Market ${currency}/${currencyToConvertTo} is not currently supported`)
  }

  // We round down to avoid requesting a channel that is too large on the
  // relayer, however the remainder should only ever be one satoshi
  return Big(balance).times(multiplier).round(0, 0).toString()
}

module.exports = convertBalance
