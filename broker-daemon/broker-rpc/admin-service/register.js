const { registerUrls } = require('../../config')

/**
 * Register the publicKey with the Relayer
 *
 * @param {GrpcUnaryMethod~request} request - request object
 * @param {RelayerClient} request.relayer - grpc Client for interacting with the Relayer
 * @param {Object} request.logger
 * @param {Object} responses
 * @param {Function} responses.RegisterResponse - constructor for RegisterResponse messages
 * @returns {RegisterResponse}
 * @throws {Error} Unable to find registration url
 */
async function register ({ relayer, logger, network }, { RegisterResponse }) {
  const publicKey = relayer.identity.pubKeyBase64

  // Currently we don't do anything with this entityId but we will need it in the future
  const { entityId } = await relayer.adminService.register({ publicKey })

  logger.info('Successfully registered Broker with relayer', { entityId })

  const registerUrl = registerUrls[network]

  if (!registerUrl) {
    throw new Error(`Could not find registration url for network ${network}, please check broker configuration`)
  }

  const url = `${registerUrl}${entityId}`

  return new RegisterResponse({ entityId, url })
}

module.exports = register
