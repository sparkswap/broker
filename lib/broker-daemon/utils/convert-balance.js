const { Big } = require('./big');
const MARKET_CONVERSION = {
    'BTC/LTC': 60
};
function convertBalance(balance, currency, currencyToConvertTo) {
    let multiplier;
    if (MARKET_CONVERSION.hasOwnProperty(`${currency}/${currencyToConvertTo}`)) {
        multiplier = Big(MARKET_CONVERSION[`${currency}/${currencyToConvertTo}`]);
    }
    else if (MARKET_CONVERSION.hasOwnProperty(`${currencyToConvertTo}/${currency}`)) {
        multiplier = Big(1).div(MARKET_CONVERSION[`${currencyToConvertTo}/${currency}`]);
    }
    else {
        throw Error(`Market ${currency}/${currencyToConvertTo} is not currently supported`);
    }
    return Big(balance).times(multiplier).round(0, 0).toString();
}
module.exports = convertBalance;
//# sourceMappingURL=convert-balance.js.map