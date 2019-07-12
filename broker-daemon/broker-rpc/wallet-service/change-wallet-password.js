const { GrpcResponse: EmptyResponse } = require('../../utils')

/** @typedef {import('../broker-rpc-server').GrpcUnaryMethodRequest} GrpcUnaryMethodRequest */

/**
 * Change a wallet password for a specific engine
 *
 * @param {GrpcUnaryMethodRequest} request - request object
 * @throws {Error} If Engine does not exist for the given symbol
 * @throws {Error} If Engine is not in a LOCKED state
 * @returns {Promise<EmptyResponse>}
 */
async function changeWalletPassword ({ logger, params, engines }) {
  const {
    symbol,
    currentPassword,
    newPassword
  } = params
  const engine = engines.get(symbol)

  if (!engine) {
    logger.error(`Could not find engine: ${symbol}`)
    throw new Error(`Unable to change wallet password. No engine available for ${symbol}`)
  }

  if (!engine.isLocked) {
    logger.error(`Engine for ${symbol} is not locked. Current status: ${engine.status}`)
    throw new Error(`Unable to change your wallet password, engine for ${symbol} is currently: ${engine.status}.
                     Your engine needs to be in a locked status`)
  }

  await engine.changeWalletPassword(currentPassword, newPassword)

  return new EmptyResponse({})
}

module.exports = changeWalletPassword
