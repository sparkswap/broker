/**
 * Grabs the daemons lnd wallet balance
 *
 * @function
 * @param {GrpcUnaryMethod~request} request - request object
 * @param {RelayerClient} request.engine
 * @param {Object} responses
 * @param {function} responses.BalanceResponse
 * @return {responses.NewAddressResponse}
 */
async function newDepositAddress ({ logger, engine }, { BalanceResponse }) {
  const { totalBalance: balance } = await engine.walletBalance()
  logger.info(`Received wallet balance: ${balance}`)
  return new BalanceResponse({ balance })
}

module.exports = newDepositAddress
