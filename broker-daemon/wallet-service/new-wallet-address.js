/**
 * Generates a new wallet address from the specified engine
 *
 * @function
 * @param {GrpcUnaryMethod~request} request - request object
 * @param {RelayerClient} request.engine
 * @param {Object} responses
 * @param {function} responses.NewAddressResponse - constructor for HealthCheckResponse messages
 * @return {responses.NewAddressResponse}
 */
async function newWalletAddress ({ logger, engine }, { NewAddressResponse }) {
  const address = await engine.newAddress()
  return new NewAddressResponse({ address })
}

module.exports = newWalletAddress
