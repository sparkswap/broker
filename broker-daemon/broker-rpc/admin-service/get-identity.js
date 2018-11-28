/**
 * Get the identity of the Broker
 *
 * @param {GrpcUnaryMethod~request} request - request object
 * @param {RelayerClient} request.relayer - grpc Client for interacting with the Relayer
 * @param {Object} request.logger
 * @param {Object} responses
 * @param {function} responses.GetIdentityResponse - constructor for GetIdentityResponse messages
 * @return {responses.GetIdentityResponse}
 */
async function getIdentity ({ relayer, logger }, { GetIdentityResponse }) {
  const publicKey = relayer.identity.pubKey

  return new GetIdentityResponse({ publicKey })
}

module.exports = getIdentity
