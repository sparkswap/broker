const { Big } = require('../../utils')

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
 * @param {Function} responses.EmptyResponse
 * @returns {EmptyResponse}
 */
async function commit ({ params, relayer, logger, engines, orderbooks }, { EmptyResponse }) {
  const { balance: balanceCommon, symbol, market } = params

  const orderbook = orderbooks.get(market)

  if (!orderbook) {
    throw new Error(`${market} is not being tracked as a market.`)
  }

  const { address } = await relayer.paymentChannelNetworkService.getAddress({ symbol })

  const [ baseSymbol, counterSymbol ] = market.split('/')
  const inverseSymbol = (symbol === baseSymbol) ? counterSymbol : baseSymbol

  const engine = engines.get(symbol)
  const inverseEngine = engines.get(inverseSymbol)

  if (!engine) {
    logger.error(`Could not find engine: ${symbol}`)
    throw new Error(`No engine is configured for symbol: ${symbol}`)
  }

  if (!inverseEngine) {
    logger.error(`Could not find inverse engine: ${inverseSymbol}`)
    throw new Error(`No engine is configured for symbol: ${inverseSymbol}`)
  }

  const maxChannelBalance = Big(engine.maxChannelBalance)
  const balance = Big(balanceCommon).times(engine.quantumsPerCommon).toString()

  logger.info(`Attempting to create channel with ${address} on ${symbol} with ${balanceCommon}`, {
    balanceCommon,
    balance
  })

  // We use common units for these calculation so that we can provide
  // friendly errors to the user.
  // TODO: Get correct fee amount from engine
  if (MINIMUM_FUNDING_AMOUNT.gt(balanceCommon)) {
    throw new Error(`Minimum balance of ${MINIMUM_FUNDING_AMOUNT} needed to commit to the relayer`)
  } else if (maxChannelBalance.lt(balance)) {
    const maxChannelBalanceCommon = Big(maxChannelBalance).div(engine.quantumsPerCommon).toString()
    logger.error(`Balance from the client exceeds maximum balance allowed (${maxChannelBalance.toString()}).`, { balance })
    throw new Error(`Maximum balance of ${maxChannelBalanceCommon} ${symbol} exceeded for ` +
      `committing of ${balanceCommon} ${symbol} to the Relayer. Please try again.`)
  }

  // Get the max balance for outbound channel to see if there are already channels with the balance open. If this is the
  // case we do not need to go to the trouble of opening a new channel
  const { maxBalance: maxOutboundBalance } = await engine.getMaxChannel()

  // If maxOutboundBalance exists, we need to check if the balance is greater or less than the balance of the channel
  // we are trying to open. If maxOutboundBalance does not exist, it means there are no channels open and we can safely
  // attempt to create channels with the balance
  if (maxOutboundBalance) {
    const insufficientOutboundBalance = maxOutboundBalance && Big(maxOutboundBalance).plus(engine.feeEstimate).lt(balance)

    if (insufficientOutboundBalance) {
      logger.error('Existing outbound channel of insufficient size', { desiredBalance: balance, feeEstimate: engine.feeEstimate, existingBalance: maxOutboundBalance })
      throw new Error('You have an existing outbound channel with a balance lower than desired, release that channel and try again.')
    }
  }

  if (!maxOutboundBalance) {
    logger.debug('Creating outbound channel', { address, balance })

    try {
      await engine.createChannel(address, balance)
    } catch (e) {
      logger.error('Received error when creating outbound channel', { error: e.stack })
      throw new Error(`Funding error: ${e.message}`)
    }
  } else {
    logger.debug('Outbound channel already exists', { balance: maxOutboundBalance })
  }

  logger.debug(`Connecting to the relayer with inverse engine: ${inverseSymbol}`)

  // We want to make sure we are connected to the relayer on the inverseSymbol before
  // we ask the relayer to open a channel to us. This is to ensure that the relayer
  // knows about the engine and wont fail when creating a channel with us. Additionally,
  // this action allows our node to not have a public IP and ports opened
  const { address: inverseAddress } = await relayer.paymentChannelNetworkService.getAddress({ symbol: inverseSymbol })

  await inverseEngine.connectUser(inverseAddress)

  logger.debug('Creating inbound channel', { balance, symbol, inverseSymbol })

  const outboundPaymentChannelNetworkAddress = await engine.getPaymentChannelNetworkAddress()
  const inboundPaymentChannelNetworkAddress = await inverseEngine.getPaymentChannelNetworkAddress()

  try {
    const authorization = relayer.identity.authorize()
    await relayer.paymentChannelNetworkService.createChannel({
      outbound: {
        balance,
        symbol,
        address: outboundPaymentChannelNetworkAddress
      },
      inbound: {
        symbol: inverseSymbol,
        address: inboundPaymentChannelNetworkAddress
      }
    }, authorization)
  } catch (e) {
    // TODO: Close channel that was open if relayer call has failed
    throw new Error(`Error requesting inbound channel from Relayer: ${e.message}`)
  }

  return new EmptyResponse({})
}

module.exports = commit
