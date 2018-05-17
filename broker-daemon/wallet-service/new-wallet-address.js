/**
 * Check the health of all the system components
 *
 * @param {GrpcUnaryMethod~request} request - request object
 * @param {RelayerClient} request.relayer - grpc Client for interacting with the Relayer
 * @param {Object} responses
 * @param {function} responses.HealthCheckResponse - constructor for HealthCheckResponse messages
 * @return {responses.HealthCheckResponse}
 */
async function newWalletAddress ({ engine }, { NewWalletAddressResponse }) {
  const address = await engine.newAddress()
  return new NewWalletAddressResponse({ address })
}

module.exports = newWalletAddress
