const { PublicError } = require('grpc-methods')
const { convertBalance, Big } = require('../../utils')
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

  // This is temporary until we have other markets
  const inverseSymbol = (symbol === SUPPORTED_SYMBOLS.LTC) ? SUPPORTED_SYMBOLS.BTC : SUPPORTED_SYMBOLS.LTC

  const engine = engines.get(symbol)
  const inverseEngine = engines.get(inverseSymbol)

  if (!engine) {
    logger.error(`Could not find engine: ${symbol}`)
    throw new PublicError(`No engine is configured for symbol: ${symbol}`)
  }

  if (!inverseEngine) {
    logger.error(`Could not find inverse engine: ${inverseSymbol}`)
    throw new PublicError(`No engine is configured for symbol: ${inverseSymbol}`)
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

  // Get the max balance for outbound and inbound channels to see if there are already channels with the balance open. If this is the
  // case we do not need to go to the trouble of opening new channels
  const {maxBalance: maxOutboundBalance} = await engine.getMaxChannel()
  const {maxBalance: maxInboundBalance} = await inverseEngine.getMaxChannel({outbound: false})
  const convertedBalance = convertBalance(balance, symbol, inverseSymbol)

  // If maxOutboundBalance or maxInboundBalance exist, we need to check if the balances are greater or less than the balance of the channel
  // we are trying to open. If neither maxOutboundBalance nor maxInboundBalance exist, it means there are no channels open and we can safely
  // attempt to create channels with the balance
  if (maxOutboundBalance || maxInboundBalance) {
    const insufficientOutboundBalance = maxOutboundBalance && Big(maxOutboundBalance).lt(balance)
    const insufficientInboundBalance = maxInboundBalance && Big(maxInboundBalance).lt(convertedBalance)

    let errorMessage
    if (insufficientOutboundBalance) {
      errorMessage = 'You have another outbound channel open with a balance lower than desired, release that channel and try again.'
    } else if (insufficientInboundBalance) {
      errorMessage = 'You have another inbound channel open with a balance lower than desired, release that channel and try again.'
    } else {
      errorMessage = 'You already have a channel open with that balance or greater.'
    }
    logger.error(`${errorMessage}, balance: ${balance}, maxOutboundBalance: ${maxOutboundBalance}, maxInboundBalance: ${maxInboundBalance}, inboundBalance: ${convertedBalance}`)
    throw new PublicError(errorMessage)
  }

  await engine.createChannel(address, balance)

  const paymentChannelNetworkAddress = await inverseEngine.getPaymentChannelNetworkAddress()

  await relayer.paymentChannelNetworkService.createChannel({address: paymentChannelNetworkAddress, balance: convertedBalance, symbol: inverseSymbol})

  return new EmptyResponse({})
}

module.exports = commitBalance
