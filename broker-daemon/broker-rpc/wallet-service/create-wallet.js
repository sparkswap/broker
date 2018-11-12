const { PublicError } = require('grpc-methods')

/**
 * Creates a new wallet for a specific engine
 *
 * @param {GrpcUnaryMethod~request} request - request object
 * @param {Logger} request.logger
 * @param {Object<String>} request.params
 * @param {String} request.params.symbol
 * @param {String} request.params.password
 * @param {Array<Engine>} request.engines
 * @param {Object} responses
 * @param {Function} responses.CreateWalletResponse
 * @return {NewDepositAddressResponse}
 */
async function createWallet ({ logger, params, engines }, { CreateWalletResponse }) {
  const { symbol, password } = params
  const engine = engines.get(symbol)

  if (!engine) {
    logger.error(`Could not find engine: ${symbol}`)
    throw new PublicError(`Unable to generate address for symbol: ${symbol}`)
  }

  const cipherSeeds = await engine.createWallet(password)

  // We need to re-validate the node after wallet creation
  // however, not sure how we should handle if the node is messed up
  try {
    await engine.validateNodeConfig()
    logger.debug(`Engine for ${symbol} has been validated`)
  } catch (e) {
    logger.error('Error validating node', { error: e.stack })
    throw new PublicError(`Error validating node for ${symbol}. Please check your broker logs`)
  }

  return new CreateWalletResponse({ cipherSeeds })
}

module.exports = createWallet
