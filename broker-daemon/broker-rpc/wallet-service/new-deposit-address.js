const { PublicError } = require('grpc-methods')

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
async function newDepositAddress ({ logger, params, engines }, { NewDepositAddressResponse }) {
  const { symbol } = params
  const engine = engines.get(symbol)

  if (!engine) {
    logger.error(`Could not find engine: ${symbol}`)
    throw new PublicError(`Could not find engine: ${symbol}`)
  }

  const address = await engine.createNewAddress()
  return new NewDepositAddressResponse({ address })
}

module.exports = newDepositAddress
