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
  const { totalBalance: balance } = await engine.getTotalBalance()
  logger.info(`Received wallet balance: ${balance}`)
  return new GetBalanceResponse({ balance })
}

module.exports = getBalance
