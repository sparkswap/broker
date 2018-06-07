const { EXCHANGE_LND_HOST } = process.env

/**
 * Grabs public lightning network information from relayer and opens a channel
 *
 * @param {GrpcUnaryMethod~request} request - request object
 * @param {RelayerClient} request.relayer - grpc Client for interacting with the Relayer
 * @param {Logger} request.logger
 * @param {Engine} request.engine
 * @param {Object} responses
 * @param {function} responses.CommitBalanceResponse - constructor for HealthCheckResponse messages
 * @return {responses.CommitBalanceResponse}
 */
async function commitBalance ({ params, relayer, logger, engine }, { CommitBalanceResponse }) {
  const { publicKey: relayerPubKey } = await relayer.getPublicKey()
  const { amount, market } = params

  logger.info(`Attempting to create channel with ${EXCHANGE_LND_HOST} on ${market} with ${amount}`)

  // TODO: Validate amount
  await engine.createChannel(EXCHANGE_LND_HOST, relayerPubKey, amount)

  return new CommitBalanceResponse({ status: 'channel opened successfully' })
}

module.exports = commitBalance
