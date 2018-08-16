const { PublicError } = require('grpc-methods')

/**
 * @constant
 * @type {Boolean}
 * @default
 */
const BASIC_AUTH_DELIMITER = ':'

/**
 * Verifies a username and password from metadata sent from grpc-methods
 *
 * @see {@link https://github.com/sparkswap/grpc-methods}
 * @param {Object} params - param object from grpc-methods
 * @param {Object} metadata
 * @param {Object} logger
 * @param {Boolean} this.disableAuth
 * @param {String} this.rpcUser
 * @param {String} this.rpcPass
 * @return {True} true - if the user is authenticated
 * @return {Error} if the user is not authenticated
 */
function verify ({ metadata, logger }) {
  if (this.disableAuth === true) return true

  // Example basic auth token: 'Basic YWRtaW46cGFzc3dvcmQ='
  const { authorization: authToken } = metadata
  const [scheme, base64Token] = authToken.split(' ')
  logger.debug('Received auth token', { scheme, base64Token })

  const rawCredentials = Buffer.from(base64Token, 'base64').toString()
  const [username, password] = rawCredentials.split(BASIC_AUTH_DELIMITER)

  logger.debug('Checking if credentials are valid between cli and broker')

  // rpcUser and rpcPass are bound to context where #verify is used due to the way
  // grpc-method handles the authorization middleware
  if (username === this.rpcUser && password === this.rpcPass) {
    return true
  }

  logger.debug('Basic Authentication has failed. Username/Password did not match')
  throw new PublicError('Basic Authentication Failed, please check the clis user/pass credentials')
}

module.exports = { verify }
