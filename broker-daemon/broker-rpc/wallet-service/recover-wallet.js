/**
 * Attempts to recover a wallet for a new lnd instance
 *
 * @param {GrpcUnaryMethod~request} request - request object
 * @param {Logger} request.logger
 * @param {Object<string>} request.params
 * @param {string} request.params.symbol - currency symbol of the wallet e.g. `BTC`
 * @param {string} request.params.password - password for the existing wallet
 * @param {string} request.params.seed - string representation of 24 word mnemonic seed delimited by spaces
 * @param {string} request.params.backup - backup path file
 * @param {Map<Engine>} request.engines
 * @param {Object} responses
 * @param {Function} responses.EmptyResponse
 * @returns {EmptyResponse}
 */
async function recoverWallet ({ logger, params, engines }, { EmptyResponse }) {
  const {
    symbol,
    password,
    seed,
    useBackupFile
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

  await engine.recoverWallet(password, seed, useBackupFile)

  return new EmptyResponse({})
}

module.exports = recoverWallet
