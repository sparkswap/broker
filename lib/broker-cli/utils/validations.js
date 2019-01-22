const { isInt, isAlpha, isURL, isDecimal: validatorIsDecimal, matches } = require('validator');
const { Big } = require('./big');
const MAX_VALUE = '9223372036854775807';
function isDecimal(str) {
    if ((validatorIsDecimal(str, { decimal_places: '1,19' }) || isInt(str)) && Big(str).lte(MAX_VALUE)) {
        return str;
    }
    throw new Error('Invalid decimal format');
}
function validMarketNameLength(marketName) {
    return (marketName.length >= 2 && marketName.length <= 5);
}
function isMarketName(str) {
    try {
        const [base, counter] = str.split('/');
        if (isAlpha(base) &&
            validMarketNameLength(base) &&
            isAlpha(counter) &&
            validMarketNameLength(counter)) {
            return str.toUpperCase();
        }
        throw new Error();
    }
    catch (e) {
        throw new Error('Market Name format is incorrect');
    }
}
function validMarketNames(marketNames) {
    return marketNames.split(',').every(isMarketName);
}
function areValidMarketNames(marketNames) {
    try {
        if (marketNames === '' || validMarketNames(marketNames)) {
            return marketNames;
        }
    }
    catch (e) {
        throw new Error('One or more market names is invalid');
    }
}
function isHost(str) {
    if (isURL(str, {
        require_valid_protocol: false,
        require_tld: false,
        allow_underscores: true
    })) {
        return str;
    }
    throw new Error('Invalid address');
}
function isFormattedPath(str) {
    if (matches(str, /^.+$/)) {
        return str;
    }
    throw new Error('Path format is incorrect');
}
function isBlockOrderId(str) {
    if (matches(str, /^[a-zA-Z0-9_-]+$/)) {
        return str;
    }
    throw new Error('Block order IDs only contain upper and lower case letters, numbers, dashes (-) and underscores (_).');
}
function isDate(str) {
    if (new Date(str) !== 'Invalid Date' && !isNaN(new Date(str))) {
        if (str === new Date(str).toISOString()) {
            return str;
        }
    }
    throw new Error('Given datetime is not in a valid date format');
}
function isPositiveInteger(str) {
    if (/^\+?[1-9][\d]*$/.test(str)) {
        return str;
    }
    throw new Error('Not a valid integer value');
}
module.exports = {
    isDecimal,
    isMarketName,
    isHost,
    isFormattedPath,
    areValidMarketNames,
    isBlockOrderId,
    isDate,
    isPositiveInteger
};
//# sourceMappingURL=validations.js.map