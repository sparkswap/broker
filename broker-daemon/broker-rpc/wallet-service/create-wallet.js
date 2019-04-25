/**
 * Creates a new wallet for a specific engine
 *
 * @param {GrpcUnaryMethod~request} request - request object
 * @param {Logger} request.logger
 * @param {Object<string>} request.params
 * @param {string} request.params.symbol - currency symbol of the wallet e.g. `BTC`
 * @param {string} request.params.password - password for the newly created wallet
 * @param {Map<Engine>} request.engines
 * @param {Object} responses
 * @param {Function} responses.CreateWalletResponse
 * @returns {CreateWalletResponse}
 */
async function createWallet ({ logger, params, engines }, { CreateWalletResponse }) {
  const { symbol, password } = params
  const engine = engines.get(symbol)

  if (!engine) {
    logger.error(`Could not find engine: ${symbol}`)
    throw new Error(`Unable to create wallet for engine: ${symbol}`)
  }

  const recoverySeed = await engine.createWallet(password)

  return new CreateWalletResponse({ recoverySeed })
}

module.exports = createWallet
