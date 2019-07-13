const { registerUrls } = require('../../config.json')
const { GrpcResponse: RegisterResponse } = require('../../utils')

/** @typedef {import('../broker-rpc-server').GrpcUnaryMethodRequest} GrpcUnaryMethodRequest */

/**
 * Register the publicKey with the Relayer
 *
 * @param {GrpcUnaryMethodRequest} request - request object
 * @returns {Promise<RegisterResponse>}
 * @throws {Error} Unable to find registration url
 */
async function register ({ relayer, logger }) {
  const publicKey = relayer.identity.pubKeyBase64

  // Currently we don't do anything with this entityId but we will need it in the future
  const { entityId } = await relayer.adminService.register({ publicKey })

  logger.info('Successfully registered Broker with relayer', { entityId })

  // @ts-ignore
  if (!global.sparkswap || !global.sparkswap.network) {
    throw new Error('Configuration error: Could not find network for broker')
  }

  // @ts-ignore
  const registerUrl = registerUrls[global.sparkswap.network]

  if (!registerUrl) {
    // @ts-ignore
    throw new Error(`Could not find registration url for network ${global.sparkswap.network}, please check broker configuration`)
  }

  const url = `${registerUrl}${entityId}`

  return new RegisterResponse({ entityId, url })
}

module.exports = register
