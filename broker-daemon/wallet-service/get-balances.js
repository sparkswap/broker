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
async function getBalances ({ logger, engine }, { GetBalancesResponse }) {
  const [
    totalBalance,
    totalCommittedBalance,
    totalUncommittedBalance,
    channelBalances
  ] = await Promise.all([
    engine.getTotalBalance(),
    engine.getUnconfirmedBalance(),
    engine.getConfirmedBalance(),
    engine.getChannelBalances()
  ])

  logger.info(`Received wallet balance: ${totalBalance}`)

  const committedBalances = channelBalances.map(({ symbol, value }) => ({ symbol, value: value.toString() }))

  return new GetBalancesResponse({
    totalBalance,
    totalCommittedBalance,
    totalUncommittedBalance,
    committedBalances
  })
}

module.exports = getBalances
