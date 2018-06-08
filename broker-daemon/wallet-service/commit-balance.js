/**
 * @constant
 * @type {String}
 * @default
 */
const EXCHANGE_LND_HOST = process.env.EXCHANGE_LND_HOST

/**
 * @constant
 * @type {Long}
 * @default
 */
const MINIMUM_FUNDING_AMOUNT = 400000

/**
 * Grabs public lightning network information from relayer and opens a channel
 *
 * @param {GrpcUnaryMethod~request} request - request object
 * @param {RelayerClient} request.relayer - grpc Client for interacting with the Relayer
 * @param {Logger} request.logger
 * @param {Engine} request.engine
 * @param {Object} responses
 * @param {function} responses.SetupResponse - constructor for HealthCheckResponse messages
 * @return {responses.SetupResponse}
 */
async function setup ({ params, relayer, logger, engine }, { CommitBalanceResponse }) {
  const { publicKey: relayerPubKey } = await relayer.paymentNetworkService.getPublicKey({})
  const { balance, market } = params

  logger.info(`Attempting to create channel with ${EXCHANGE_LND_HOST} on ${market} with ${balance}`)

  // TODO: Validate that the amount is above the minimum channel balance
  // TODO: Choose the correct engine depending on the market
  // TODO: Get correct fee amount from engine

  // const FEE_AMOUNT = 900
  // const feeExcludedBalance = (Number.parseInt(balance) - FEE_AMOUNT)
  await engine.createChannel(EXCHANGE_LND_HOST, relayerPubKey, MINIMUM_FUNDING_AMOUNT)

  return new CommitBalanceResponse({ status: 'channel opened successfully' })
}

module.exports = setup
