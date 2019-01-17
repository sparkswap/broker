const { PublicError } = require('grpc-methods')

/**
 * Unlock an engine's wallet
 *
 * @param {GrpcUnaryMethod~request} request - request object
 * @param {Logger} request.logger
 * @param {Object<String>} request.params
 * @param {String} request.params.symbol - currency symbol of the wallet e.g. `BTC`
 * @param {String} request.params.password - password for the specified engine's wallet
 * @param {Map<Engine>} request.engines
 * @param {Object} responses
 * @param {Function} responses.EmptyResponse
 * @return {EmptyResponse}
 */
async function unlockWallet ({ logger, params, engines }, { EmptyResponse }) {
  const { symbol, password } = params
  const engine = engines.get(symbol)

  if (!engine) {
    logger.error(`Could not find engine: ${symbol}`)
    throw new PublicError(`Unable to unlock wallet. No engine available for ${symbol}`)
  }

  if (!engine.isLocked) {
    logger.error(`Engine for ${symbol} is not locked. Current status: ${engine.status}`)
    throw new PublicError(`Unable to unlock wallet, engine for ${symbol} is currently: ${engine.status}`)
  }

  await engine.unlockWallet(password)

  return new EmptyResponse({})
}

module.exports = unlockWallet
