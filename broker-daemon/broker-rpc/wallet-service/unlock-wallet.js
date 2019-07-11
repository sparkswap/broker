/**
 * Unlock an engine's wallet
 *
 * @param {GrpcUnaryMethod~request} request - request object
 * @param {Logger} request.logger
 * @param {object<string>} request.params
 * @param {string} request.params.symbol - currency symbol of the wallet e.g. `BTC`
 * @param {string} request.params.password - password for the specified engine's wallet
 * @param {Map<Engine>} request.engines
 * @param {object} responses
 * @param {Function} responses.EmptyResponse
 * @throws {Error} If Engine does not exist for the given symbol
 * @throws {Error} If Engine is not in a LOCKED state
 * @returns {EmptyResponse}
 */
async function unlockWallet ({ logger, params, engines }, { EmptyResponse }) {
  const { symbol, password } = params
  const engine = engines.get(symbol)

  if (!engine) {
    logger.error(`Could not find engine: ${symbol}`)
    throw new Error(`Unable to unlock wallet. No engine available for ${symbol}`)
  }

  if (!engine.isLocked) {
    logger.error(`Engine for ${symbol} is not locked. Current status: ${engine.status}`)
    throw new Error(`Unable to unlock wallet, engine for ${symbol} is currently: ${engine.status}`)
  }

  await engine.unlockWallet(password)

  return new EmptyResponse({})
}

module.exports = unlockWallet
