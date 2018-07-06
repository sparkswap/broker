const { PublicError } = require('grpc-methods')
const { Big, convertBalance } = require('../utils')
/**
 * @constant
 * @type {String}
 * @default
 */
const EXCHANGE_LND_HOST = process.env.EXCHANGE_LND_HOST

/**
 * @constant
 * @type {String}
 * @default
 */
const LND_EXTERNAL_ADDRESS = process.env.LND_EXTERNAL_ADDRESS

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
 * Maximum channel balance (no inclusive) is 2^32 or 16777216
 * More info: https://github.com/lightningnetwork/lnd/releases/tag/v0.3-alpha
 *
 * @todo make this engine agnostic (non-LND)
 * @constant
 * @type {Long}
 * @default
 */
const MAX_CHANNEL_BALANCE = 16777215

/**
 * @constant
 * @type {Array<key, string>}
 * @default
 */
const SUPPORTED_SYMBOLS = Object.freeze({
  BTC: 'BTC',
  LTC: 'LTC'
})

/**
 * Grabs public lightning network information from relayer and opens a channel
 *
 * @param {Object} request - request object
 * @param {Object} request.params
 * @param {RelayerClient} request.relayer
 * @param {Logger} request.logger
 * @param {Engine} request.engine
 * @param {Object} responses
 * @param {function} responses.EmptyResponse
 * @return {responses.EmptyResponse}
 */
async function commitBalance ({ params, relayer, logger, engine }, { EmptyResponse }) {
  const { publicKey: relayerPubKey } = await relayer.paymentNetworkService.getPublicKey({})
  const { balance, symbol } = params

  logger.info(`Attempting to create channel with ${EXCHANGE_LND_HOST} on ${symbol} with ${balance}`)

  // TODO: Validate that the amount is above the minimum channel balance
  // TODO: Choose the correct engine depending on the market
  // TODO: Get correct fee amount from engine
  if (balance < MINIMUM_FUNDING_AMOUNT) {
    throw new PublicError(`Minimum balance of ${MINIMUM_FUNDING_AMOUNT} needed to commit to the relayer`)
  } else if (balance > MAX_CHANNEL_BALANCE) {
    logger.error(`Balance from the client exceeds maximum balance allowed (${MAX_CHANNEL_BALANCE}).`, { balance })
    throw new PublicError(`Maxium balance of ${MAX_CHANNEL_BALANCE} exceeded for committing to the relayer. Please try again.`)
  }

  if (!Object.values(SUPPORTED_SYMBOLS).includes(symbol)) {
    throw new PublicError(`Unsupported symbol for committing a balance: ${symbol}`)
  }

  await engine.createChannel(EXCHANGE_LND_HOST, relayerPubKey, balance, symbol)

  const publicKey = await engine.getPublicKey({})

  let symbolForRelayer
  let convertedBalance

  // This is temporary until we have other markets
  if (symbol === SUPPORTED_SYMBOLS.LTC) {
    symbolForRelayer = SUPPORTED_SYMBOLS.BTC
    convertedBalance = convertBalance(Big(balance), SUPPORTED_SYMBOLS.LTC, SUPPORTED_SYMBOLS.BTC)
  } else {
    symbolForRelayer = SUPPORTED_SYMBOLS.LTC
    convertedBalance = convertBalance(Big(balance), SUPPORTED_SYMBOLS.BTC, SUPPORTED_SYMBOLS.LTC)
  }
  await relayer.paymentNetworkService.createChannel({publicKey, host: LND_EXTERNAL_ADDRESS, balance: convertedBalance.toString(), symbol: symbolForRelayer})

  return new EmptyResponse({})
}

module.exports = commitBalance
