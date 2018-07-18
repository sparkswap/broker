const { PublicError } = require('grpc-methods')
const { convertBalance } = require('../../utils')
const { currencies } = require('../../config')
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

const SUPPORTED_SYMBOLS = currencies.reduce((obj, currency) => {
  obj[currency.symbol] = currency.symbol
  return obj
}, {})

/**
 * Grabs public lightning network information from relayer and opens a channel
 *
 * @param {Object} request - request object
 * @param {Object} request.params
 * @param {RelayerClient} request.relayer
 * @param {Logger} request.logger
 * @param {Engine} request.engines
 * @param {Object} responses
 * @param {function} responses.EmptyResponse
 * @return {responses.EmptyResponse}
 */
async function commitBalance ({ params, relayer, logger, engines }, { EmptyResponse }) {
  const { balance, symbol } = params
  const { address } = await relayer.paymentChannelNetworkService.getAddress({symbol})

  const engine = engines.get(symbol)

  if (!engine) {
    logger.error(`Could not find engine: ${symbol}`)
    throw new PublicError(`No engine is configured for symbol: ${symbol}`)
  }

  logger.info(`Attempting to create channel with ${address} on ${symbol} with ${balance}`)

  // TODO: Validate that the amount is above the minimum channel balance
  // TODO: Choose the correct engine depending on the market
  // TODO: Get correct fee amount from engine
  if (balance < MINIMUM_FUNDING_AMOUNT) {
    throw new PublicError(`Minimum balance of ${MINIMUM_FUNDING_AMOUNT} needed to commit to the relayer`)
  } else if (balance > MAX_CHANNEL_BALANCE) {
    logger.error(`Balance from the client exceeds maximum balance allowed (${MAX_CHANNEL_BALANCE}).`, { balance })
    throw new PublicError(`Maxium balance of ${MAX_CHANNEL_BALANCE} exceeded for committing to the relayer. Please try again.`)
  }

  await engine.createChannel(address, balance)

  let symbolForRelayer
  let convertedBalance
  let counterSymbol

  // This is temporary until we have other markets
  if (symbol === SUPPORTED_SYMBOLS.LTC) {
    symbolForRelayer = SUPPORTED_SYMBOLS.BTC
    convertedBalance = convertBalance(balance, SUPPORTED_SYMBOLS.LTC, SUPPORTED_SYMBOLS.BTC)
    counterSymbol = SUPPORTED_SYMBOLS.BTC
  } else {
    symbolForRelayer = SUPPORTED_SYMBOLS.LTC
    convertedBalance = convertBalance(balance, SUPPORTED_SYMBOLS.BTC, SUPPORTED_SYMBOLS.LTC)
    counterSymbol = SUPPORTED_SYMBOLS.LTC
  }

  const counterEngine = engines.get(counterSymbol)

  if (!counterEngine) {
    logger.error(`Could not find engine: ${counterSymbol}`)
    throw new PublicError(`No engine is configured for symbol: ${counterSymbol}`)
  }

  const paymentChannelNetworkAddress = await counterEngine.getPaymentChannelNetworkAddress()
  await relayer.paymentChannelNetworkService.createChannel({address: paymentChannelNetworkAddress, balance: convertedBalance, symbol: symbolForRelayer})

  return new EmptyResponse({})
}

module.exports = commitBalance
