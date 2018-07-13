/**
 * Given engine information from the daemon, grab the balance from a specified engine
 *
 * @param {Array<symbol, engine>} Kinesis Engine
 * @return {Object} res
 * @return {Object} res.symbol
 * @return {Object} res.totalBalance
 * @return {Object} res.totalChannelBalance
 */
async function balancesFromEngine ([symbol, engine]) {
  const [totalBalance, totalChannelBalance] = await Promise.all([
    engine.getTotalBalance(),
    engine.getTotalChannelBalance()
  ])

  return {
    symbol,
    totalBalance,
    totalChannelBalance
  }
}

/**
 * Grabs the daemons lnd wallet balance
 *
 * @function
 * @param {GrpcUnaryMethod~request} request - request object
 * @param {Map} request.engine
 * @param {Object} responses
 * @param {function} responses.GetBalanceResponse
 * @return {responses.GetBalanaceResponse}
 */
async function getBalances ({ logger, engines }, { GetBalancesResponse }) {
  logger.info(`Checking wallet balances for ${engines.size} engines`)

  // We convert the engines map to an array and run totalBalance commands
  // against each configuration
  const engineBalances = await Promise.all(Array.from(engines).map(balancesFromEngine))

  return new GetBalancesResponse({ balances: engineBalances })
}

module.exports = getBalances
