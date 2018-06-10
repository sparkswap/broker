const { PublicError } = require('grpc-methods')

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
 * This is the max allowed balance for a channel for LND while software is currently
 * in beta
 *
 * @todo make this engine agnostic
 * @constant
 * @type {Long}
 * @default
 */
const MAX_CHANNEL_BALANCE = 16777216

/**
 * Grabs public lightning network information from relayer and opens a channel
 *
 * @param {Object} request - request object
 * @param {Object} request.params
 * @param {RelayerClient} request.relayer
 * @param {Logger} request.logger
 * @param {Engine} request.engine
 * @param {Object} responses
 * @param {function} responses.CommitBalanceResponse - constructor for HealthCheckResponse messages
 * @return {responses.CommitBalanceResponse}
 */
async function commitBalance ({ params, relayer, logger, engine }, { CommitBalanceResponse }) {
  const { publicKey: relayerPubKey } = await relayer.paymentNetworkService.getPublicKey({})
  const { balance, market } = params

  logger.info(`Attempting to create channel with ${EXCHANGE_LND_HOST} on ${market} with ${balance}`)

  // TODO: Validate that the amount is above the minimum channel balance
  // TODO: Choose the correct engine depending on the market
  // TODO: Get correct fee amount from engine
  if (balance < MINIMUM_FUNDING_AMOUNT) {
    throw new PublicError(`Minimum balance of ${MINIMUM_FUNDING_AMOUNT} needed to commit to the relayer`)
  } else if (balance > MAX_CHANNEL_BALANCE) {
    logger.error(`Balance from the client exceeds maximum balance allowed (${MAX_CHANNEL_BALANCE}).`, { balance })
    throw new PublicError(`Maxium balance of ${MAX_CHANNEL_BALANCE} exceeded for committing to the relayer. Please try again.`)
  }

  await engine.createChannel(EXCHANGE_LND_HOST, relayerPubKey, balance)

  return new CommitBalanceResponse({ status: 'channel opened successfully' })
}

module.exports = commitBalance
