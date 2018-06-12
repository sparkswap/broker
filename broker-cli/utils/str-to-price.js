/**
 * Convert a string representation of a decimal into something that
 * our grpc Price type can use
 * @param  {String} str String representation of a price (e.g. '12390123908.2384098' or '923480128394')
 * @return {Object}     Object representation of our price type
 */
function strToPrice (str) {
  let [ integer, decimal ] = str.split('.')
  decimal = decimal || '0'

  return { integer, decimal }
}

module.exports = strToPrice
