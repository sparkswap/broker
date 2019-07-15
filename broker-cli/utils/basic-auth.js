const grpc = require('grpc')

/**
 * @constant
 * @type {string}
 * @default
 */
const BASIC_AUTH_PREFIX = 'Basic'

/**
 * @constant
 * @type {string}
 * @default
 */
const BASIC_AUTH_DELIMITER = ':'

/**
 * Creates a Basic Authentication string (Base64) from user/password credentials
 *
 * Example Result: `Basic
 *
 * @private
 * @param {string} username
 * @param {string} password
 * @returns {string} res - Basic Authentication string (RFC 7235)
 */
function credentialsToBasicAuth (username, password) {
  const encodedCredentials = Buffer.from(`${username}${BASIC_AUTH_DELIMITER}${password}`).toString('base64')
  return `${BASIC_AUTH_PREFIX} ${encodedCredentials}`
}

/**
 * Generates Basic Authentication call credentials
 *
 * @param {string} username
 * @param {string} password
 * @returns {object} grpc credentials
 */
function generateBasicAuthCredentials (username, password) {
  return grpc.credentials.createFromMetadataGenerator((_, callback) => {
    const metadata = new grpc.Metadata()
    metadata.set('Authorization', credentialsToBasicAuth(username, password))
    callback(null, metadata)
  })
}

module.exports = {
  generateBasicAuthCredentials
}
