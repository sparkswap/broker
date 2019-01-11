const { PublicError } = require('grpc-methods')

const { convertBalance, Big } = require('../../utils')

/**
 * Minimum funding amount in common units (e.g. 0.123 BTC)
 * @constant
 * @type {Big}
 * @default
 */
const MINIMUM_FUNDING_AMOUNT = Big(0.00400000)

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
async function commit ({ params, relayer, logger, engines, orderbooks }, { EmptyResponse }) {
  const { balance: balanceInCommonUnits, symbol, market } = params

  const orderbook = orderbooks.get(market)

  if (!orderbook) {
    throw new Error(`${market} is not being tracked as a market.`)
  }

  const { address } = await relayer.paymentChannelNetworkService.getAddress({symbol})

  const [ baseSymbol, counterSymbol ] = market.split('/')
  const inverseSymbol = (symbol === baseSymbol) ? counterSymbol : baseSymbol

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

  const maxChannelBalance = Big(engine.currencyConfig.maxChannelBalance)
  const balance = Big(balanceInCommonUnits).times(engine.currencyConfig.quantumsPerCommon).toString()

  logger.info(`Attempting to create channel with ${address} on ${symbol} with ${balanceInCommonUnits}`, { balanceInCommonUnits, balance })

  // We use common units for these calculation so that we can provide
  // friendly errors to the user.
  // TODO: Get correct fee amount from engine
  if (MINIMUM_FUNDING_AMOUNT.gt(balanceInCommonUnits)) {
    throw new PublicError(`Minimum balance of ${MINIMUM_FUNDING_AMOUNT} needed to commit to the relayer`)
  } else if (maxChannelBalance.lt(balance)) {
    logger.error(`Balance from the client exceeds maximum balance allowed (${maxChannelBalance.toString()}).`, { balance })
    throw new PublicError(`Maximum balance of ${maxChannelBalance.toString()} exceeded for committing of ${balance} to the relayer. Please try again.`)
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
      errorMessage = `You already have a channel open with ${balanceInCommonUnits} or greater.`
    }

    logger.error(errorMessage, { balance, maxOutboundBalance, maxInboundBalance, inboundBalance: convertedBalance })
    throw new PublicError(errorMessage)
  }

  logger.debug('Creating outbound channel', { address, balance })

  try {
    await engine.createChannel(address, balance)
  } catch (e) {
    logger.error('Received error when creating outbound channel', { error: e.stack })
    throw new PublicError(`Funding error: Check that you have sufficient balance`)
  }

  const paymentChannelNetworkAddress = await inverseEngine.getPaymentChannelNetworkAddress()

  try {
    logger.debug('Requesting inbound channel from relayer', { address: paymentChannelNetworkAddress, balance: convertBalance, symbol: inverseSymbol })
    await relayer.paymentChannelNetworkService.createChannel({address: paymentChannelNetworkAddress, balance: convertedBalance, symbol: inverseSymbol})
  } catch (e) {
    // TODO: Close channel that was open if relayer call has failed
    throw (e)
  }

  return new EmptyResponse({})
}

module.exports = commit
