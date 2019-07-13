const { GrpcResponse: CreateWalletResponse } = require('../../utils')

/** @typedef {import('../broker-rpc-server').GrpcUnaryMethodRequest} GrpcUnaryMethodRequest */

/**
 * Creates a new wallet for a specific engine
 *
 * @param {GrpcUnaryMethodRequest} request - request object
 * @returns {Promise<CreateWalletResponse>}
 */
async function createWallet ({ logger, params, engines }) {
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
