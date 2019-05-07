/**
 * Change a wallet password for a specific engine
 *
 * @param {GrpcUnaryMethod~request} request - request object
 * @param {Logger} request.logger
 * @param {Object<string>} request.params
 * @param {string} request.params.symbol - currency symbol of the wallet e.g. `BTC`
 * @param {string} request.params.currentPassword - password for the engine's wallet
 * @param {string} request.params.newPassword - new password for the engine's wallet
 * @param {Map<Engine>} request.engines
 * @param {Object} responses
 * @param {Function} responses.EmptyResponse
 * @throws {Error} If Engine does not exist for the given symbol
 * @throws {Error} If Engine is not in a LOCKED state
 * @returns {EmptyResponse}
 */
async function changeWalletPassword ({ logger, params, engines }, { EmptyResponse }) {
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
