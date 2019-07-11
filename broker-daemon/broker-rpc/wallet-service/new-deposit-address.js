/**
 * Generates a new wallet address from the specified engine
 *
 * @param {GrpcUnaryMethod~request} request - request object
 * @param {Logger} request.logger
 * @param {object<string>} request.params
 * @param {Array<Engine>} request.engines
 * @param {object} responses
 * @param {Function} responses.NewDepositAddressResponse
 * @returns {NewDepositAddressResponse}
 */
async function newDepositAddress ({ logger, params, engines }, { NewDepositAddressResponse }) {
  const { symbol } = params
  const engine = engines.get(symbol)

  if (!engine) {
    logger.error(`Could not find engine: ${symbol}`)
    throw new Error(`Unable to generate address for symbol: ${symbol}`)
  }

  const address = await engine.createNewAddress()
  return new NewDepositAddressResponse({ address })
}

module.exports = newDepositAddress
