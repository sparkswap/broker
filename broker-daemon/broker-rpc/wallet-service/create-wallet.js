const { PublicError } = require('grpc-methods')

/**
 * Creates a new wallet for a specific engine
 *
 * @param {GrpcUnaryMethod~request} request - request object
 * @param {Logger} request.logger
 * @param {Object<String>} request.params
 * @param {String} request.params.symbol
 * @param {String} request.params.password
 * @param {Map<Engine>} request.engines
 * @param {Object} responses
 * @param {Function} responses.CreateWalletResponse
 * @return {NewDepositAddressResponse}
 */
async function createWallet ({ logger, params, engines }, { CreateWalletResponse }) {
  const { symbol, password } = params
  const engine = engines.get(symbol)

  if (!engine) {
    logger.error(`Could not find engine: ${symbol}`)
    throw new PublicError(`Unable to create wallet for engine: ${symbol}`)
  }

  const recoverySeed = await engine.createWallet(password)

  // We need to re-validate the node after wallet creation, however, this might
  // cause the daemon to have multiple validation processes running at the same time.
  //
  // Additionally, we do not await the validation of an engine as it will be retried
  // on its own.
  engine.validateEngine()

  return new CreateWalletResponse({ recoverySeed })
}

module.exports = createWallet
