/**
 * Generates a new wallet address from the specified engine
 *
 * @function
 * @param {GrpcUnaryMethod~request} request - request object
 * @param {RelayerClient} request.engine
 * @param {Object} responses
 * @param {function} responses.NewAddressResponse
 * @return {responses.NewAddressResponse}
 */
async function newDepositAddress ({ logger, engine }, { NewDepositAddressResponse }) {
  const address = await engine.newAddress()
  return new NewDepositAddressResponse({ address })
}

module.exports = newDepositAddress
