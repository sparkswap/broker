/**
 * Convert a string representation of a decimal into something that
 * our grpc Price type can use
 * @param  {String} str String representation of a price (e.g. '12390123908.2384098' or '923480128394')
 * @return {Object}     Object representation of our price type
 */
function serializePrice (str) {
  let [ integer, decimal = '0' ] = str.split('.')

  return { integer, decimal }
}

module.exports = serializePrice
