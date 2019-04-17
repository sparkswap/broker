/**
 * Returns a summary of a wallet
 *
 * @param {GrpcUnaryMethod~request} request - request object
 * @param {Logger} request.logger
 * @param {Object<string>} request.params
 * @param {Array<Engine>} request.engines
 * @param {Object} responses
 * @param {Function} responses.EmptyResponse
 * @returns {EmptyResponse}
 */
async function walletHistory ({ logger, params, engines }, { WalletHistoryResponse }) {
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
