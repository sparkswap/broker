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
  const totalBalance = await engine.getTotalBalance()

  logger.info(`Received wallet balance: ${totalBalance}`)

  // Contains a hash of <symbol, value>
  const channelBalances = await engine.getChannelBalances()

  logger.info('Received channel balances')

  return new GetBalanceResponse({
    totalBalance,
    channelBalances
  })
}

module.exports = getBalance
