const crypto = require('crypto')

/**
 * Generate a unique ID string
 * We use 9 bytes of randonmness since this is for a single broker.
 * It can be increased for particularly high-frequency brokers as nothing should depend on the length
 * of this ID.
 * @return {String} 12 characters in [base64url encoding]{@link https://tools.ietf.org/html/rfc4648}
 */
function generateId () {
  const data = crypto.randomBytes(9).toString('hex')
  return urlEncode(crypto.createHash('sha256').update(data).digest('base64'))
}

/**
 * Convert a string from Base64 to [Base64url]{@link https://tools.ietf.org/html/rfc4648}
 * @param  {String} base64Str Base64 encoded String
 * @return {String}           Base64url encoded string
 */
function urlEncode (base64Str) {
  return base64Str
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

module.exports = generateId
