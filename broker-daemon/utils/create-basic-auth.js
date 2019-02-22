/**
 * @constant
 * @type {Boolean}
 * @default
 */
const BASIC_AUTH_DELIMITER = ':'

/**
 * Verifies a username and password from metadata sent from grpc-methods. This function is
 * called from inside the grpc-methods authorization hook.
 *
 * @see {@link https://github.com/sparkswap/grpc-methods}
 * @param {string} rpcUser
 * @param {string} rpcPass
 * @param {boolean} [disableAuth=false]
 * @return {Function}
 */
function createBasicAuth (rpcUser, rpcPass, disableAuth = false) {
  return async ({ metadata, logger }) => {
    if (disableAuth === true) return

    // Example basic auth token: 'Basic YWRtaW46cGFzc3dvcmQ='
    const { authorization: authToken } = metadata

    if (!authToken) {
      logger.debug('Basic Authentication has failed. No auth token could be found')
      throw new Error('Basic Authentication Failed, please check your authorization credentials')
    }

    const [scheme, base64Token] = authToken.split(' ')

    logger.debug('Received auth token', { scheme, base64Token })

    const rawCredentials = Buffer.from(base64Token, 'base64').toString()
    const [username, password] = rawCredentials.split(BASIC_AUTH_DELIMITER)

    logger.debug('Checking if credentials are valid between cli and broker')

    // rpcUser and rpcPass are bound to context where #verify is used due to the way
    // grpc-method handles the authorization middleware
    if (username !== rpcUser || password !== rpcPass) {
      logger.debug('Basic Authentication has failed. Username/Password did not match')
      throw new Error('Basic Authentication Failed, please check your authorization credentials')
    }
  }
}

module.exports = createBasicAuth
