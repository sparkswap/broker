/**
 * Grabs the daemons lnd wallet balance
 *
 * @function
 * @param {GrpcUnaryMethod~request} request - request object
 * @param {RelayerClient} request.engine
 * @param {Object} responses
 * @param {function} responses.GetBalanceResponse
 * @return {responses.GetBalanaceResponse}
 */
async function getBalance ({ logger, engine }, { GetBalanceResponse }) {
  const [
    totalBalance,
    totalCommittedBalance,
    totalUncommittedBalance,
    committedBalances
  ] = await Promise.all([
    engine.getTotalBalance(),
    engine.getCommittedBalance(),
    engine.getUncommittedBalance(),
    engine.getChannelBalances()
  ])

  logger.info(`Received wallet balance: ${totalBalance}`)

  return new GetBalanceResponse({
    totalBalance,
    totalCommittedBalance,
    totalUncommittedBalance,
    committedBalances
  })
}

module.exports = getBalance
