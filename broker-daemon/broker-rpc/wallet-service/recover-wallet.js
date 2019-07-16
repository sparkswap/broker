/** @typedef {import('../broker-rpc-server').GrpcUnaryMethodRequest} GrpcUnaryMethodRequest */

/**
 * Attempts to recover a wallet for a new lnd instance
 *
 * @param {GrpcUnaryMethodRequest} request - request object
 * @returns {Promise<object>}
 */
async function recoverWallet ({ logger, params, engines }) {
  const {
    symbol,
    password,
    seed,
    useBackup
  } = params

  const engine = engines.get(symbol)

  if (!engine) {
    logger.error(`Could not find engine: ${symbol}`)
    throw new Error(`Unable to recover wallet for engine: ${symbol}`)
  }

  if (!password) {
    throw new Error('Password is required to recover wallet')
  }

  if (!seed) {
    throw new Error('Recovery seed is required to recover wallet')
  }

  await engine.recoverWallet(password, seed, useBackup)

  return {}
}

module.exports = recoverWallet
