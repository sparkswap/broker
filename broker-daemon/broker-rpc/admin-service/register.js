/**
 * Sparkswap url for registering a user
 * @constant
 * @default
 * @type {String}
 */
const REGISTER_URL = 'https://sparkswap.com/register/'

/**
 * Register the publicKey with the Relayer
 *
 * @param {GrpcUnaryMethod~request} request - request object
 * @param {RelayerClient} request.relayer - grpc Client for interacting with the Relayer
 * @param {Object} request.logger
 * @param {Object} responses
 * @param {function} responses.RegisterResponse - constructor for RegisterResponse messages
 * @return {RegisterResponse}
 */
async function register ({ relayer, logger }, { RegisterResponse }) {
  const publicKey = relayer.identity.pubKeyBase64

  // Currently we don't do anything with this entityId but we will need it in the future
  const { entityId } = await relayer.adminService.register({ publicKey })

  logger.info('Successfully registered public key with relayer', { entityId })
  const url = `${REGISTER_URL}${entityId}`
  return new RegisterResponse({ entityId, url })
}

module.exports = register
