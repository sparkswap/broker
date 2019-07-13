const { GrpcResponse: EmptyResponse } = require('../../utils')

/** @typedef {import('../broker-rpc-server').GrpcUnaryMethodRequest} GrpcUnaryMethodRequest */

/**
 * Unlock an engine's wallet
 *
 * @param {GrpcUnaryMethodRequest} request - request object
 * @throws {Error} If Engine does not exist for the given symbol
 * @throws {Error} If Engine is not in a LOCKED state
 * @returns {Promise<EmptyResponse>}
 */
async function unlockWallet ({ logger, params, engines }) {
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
