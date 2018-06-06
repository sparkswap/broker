const Big = require('big.js')

/**
 * We want to use "bankers' rounding"
 * @see {@link https://en.wikipedia.org/wiki/Rounding#Round_half_to_even}
 * @see {@link http://mikemcl.github.io/big.js/#rm}
 */
Big.RM = 2

module.exports = Big
