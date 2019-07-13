const { GrpcResponse: NewDepositAddressResponse } = require('../../utils')

/** @typedef {import('../broker-rpc-server').GrpcUnaryMethodRequest} GrpcUnaryMethodRequest */

/**
 * Generates a new wallet address from the specified engine
 *
 * @param {GrpcUnaryMethodRequest} request - request object
 * @returns {Promise<NewDepositAddressResponse>}
 */
async function newDepositAddress ({ logger, params, engines }) {
  const { symbol } = params
  const engine = engines.get(symbol)

  if (!engine) {
    logger.error(`Could not find engine: ${symbol}`)
    throw new Error(`Unable to generate address for symbol: ${symbol}`)
  }

  const address = await engine.createNewAddress()
  return new NewDepositAddressResponse({ address })
}

module.exports = newDepositAddress
