/**
 * Grabs the total balance and total channel balance from a specified engine
 *
 * @param {Array<symbol, engine>} SparkSwap Payment Channel Network Engine
 * @return {Array} res
 * @return {String} res.symbol
 * @return {Object} res.engine
 */
async function getEngineBalances ([symbol, engine]) {
  const [uncommittedBalance, totalChannelBalance] = await Promise.all([
    engine.getUncommittedBalance(),
    engine.getTotalChannelBalance()
  ])

  return {
    symbol,
    uncommittedBalance,
    totalChannelBalance
  }
}

/**
 * Grabs the daemons lnd wallet balance
 *
 * @function
 * @param {GrpcUnaryMethod~request} request - request object
 * @param {Map} request.engines
 * @param {Logger} request.logger
 * @param {Object} responses
 * @param {function} responses.GetBalanceResponse
 * @return {GetBalanceResponse}
 */
async function getBalances ({ logger, engines }, { GetBalancesResponse }) {
  logger.info(`Checking wallet balances for ${engines.size} engines`)

  // We convert the engines map to an array and run totalBalance commands
  // against each configuration
  const engineBalances = await Promise.all(Array.from(engines).map(getEngineBalances))

  return new GetBalancesResponse({ balances: engineBalances })
}

module.exports = getBalances
