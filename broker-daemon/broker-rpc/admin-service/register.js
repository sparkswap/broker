const { registerUrls } = require('../../config')

/**
 * Register the publicKey with the Relayer
 *
 * @param {GrpcUnaryMethod~request} request - request object
 * @param {RelayerClient} request.relayer - grpc Client for interacting with the Relayer
 * @param {object} request.logger
 * @param {object} responses
 * @param {Function} responses.RegisterResponse - constructor for RegisterResponse messages
 * @returns {RegisterResponse}
 * @throws {Error} Unable to find registration url
 */
async function register ({ relayer, logger }, { RegisterResponse }) {
  const publicKey = relayer.identity.pubKeyBase64

  // Currently we don't do anything with this entityId but we will need it in the future
  const { entityId } = await relayer.adminService.register({ publicKey })

  logger.info('Successfully registered Broker with relayer', { entityId })

  if (!global.sparkswap || !global.sparkswap.network) {
    throw new Error('Configuration error: Could not find network for broker')
  }

  const registerUrl = registerUrls[global.sparkswap.network]

  if (!registerUrl) {
    throw new Error(`Could not find registration url for network ${global.sparkswap.network}, please check broker configuration`)
  }

  const url = `${registerUrl}${entityId}`

  return new RegisterResponse({ entityId, url })
}

module.exports = register
