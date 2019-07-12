const { GrpcResponse: WalletHistoryResponse } = require('../../utils')

/** @typedef {import('../broker-rpc-server').GrpcUnaryMethodRequest} GrpcUnaryMethodRequest */

/**
 * Returns a summary of a wallet
 *
 * @param {GrpcUnaryMethodRequest} request - request object
 * @returns {Promise<WalletHistoryResponse>}
 */
async function walletHistory ({ logger, params, engines }) {
  const { symbol } = params
  const engine = engines.get(symbol)

  if (!engine) {
    logger.error(`Could not find engine: ${symbol}`)
    throw new Error(`No engine found for symbol: ${symbol}`)
  }

  const transactions = await engine.getChainTransactions()

  logger.debug(`${transactions.length} transactions found in walletHistory`)

  return new WalletHistoryResponse({ transactions })
}

module.exports = walletHistory
