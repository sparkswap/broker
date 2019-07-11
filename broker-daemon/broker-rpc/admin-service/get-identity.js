const { GrpcResponse: GetIdentityResponse } = require('../../utils')

/** @typedef {import('../broker-rpc-server').GrpcUnaryMethodRequest} GrpcUnaryMethodRequest */
/** @typedef {import('../broker-rpc-server').RelayerClient} RelayerClient */

/**
 * Get the identity of the Broker
 *
 * @param {GrpcUnaryMethodRequest} request - request object
 * @returns {Promise<GetIdentityResponse>}
 */
async function getIdentity ({ relayer }) {
  const publicKey = relayer.identity.pubKey

  return new GetIdentityResponse({ publicKey })
}

module.exports = getIdentity
