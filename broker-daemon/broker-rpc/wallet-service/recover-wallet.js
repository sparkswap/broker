const fs = require('fs')

/**
 * Attempts to recover a wallet for a new lnd instance
 *
 * @param {GrpcUnaryMethod~request} request - request object
 * @param {Logger} request.logger
 * @param {Object<string>} request.params
 * @param {string} request.params.symbol - currency symbol of the wallet e.g. `BTC`
 * @param {string} request.params.password - password for the existing wallet
 * @param {string} request.params.seed - string representation of 24 word mnemonic seed delimited by spaces
 * @param {string} request.params.backupPath - backup path file
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
    backupPath
  } = params

  const engine = engines.get(symbol)

  if (!engine) {
    logger.error(`Could not find engine: ${symbol}`)
    throw new Error(`Unable to create wallet for engine: ${symbol}`)
  }

  console.log(params)

  let backup

  if (backupPath) {
    backup = fs.readFileSync(backupPath)
  }

  let seedList
  // Check the first element of seed. The default value for grpc will be `['']`
  if (seed[0] !== '') {
    seedList = seed
  }

  await engine.recoverWallet(password, seedList, backup)

  return new EmptyResponse({})
}

module.exports = recoverWallet
