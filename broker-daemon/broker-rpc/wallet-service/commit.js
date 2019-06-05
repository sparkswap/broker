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

  const balance = Big(balanceCommon).times(engine.quantumsPerCommon).toString()

  // We use common units for these calculation so that we can provide
  // friendly errors to the user.
  // TODO: Get correct fee amount from engine
  if (MINIMUM_FUNDING_AMOUNT.gt(balanceCommon)) {
    throw new Error(`Minimum balance of ${MINIMUM_FUNDING_AMOUNT} needed to commit to the relayer`)
  }

  // Collect all remote information
  const [
    { address: relayerAddress },
    { address: relayerInverseAddress },
    outboundPaymentChannelNetworkAddress,
    inboundPaymentChannelNetworkAddress,
    unspentBalance
  ] = await Promise.all([
    relayer.paymentChannelNetworkService.getAddress({ symbol }),
    relayer.paymentChannelNetworkService.getAddress({ symbol: inverseSymbol }),
    engine.getPaymentChannelNetworkAddress(),
    inverseEngine.getPaymentChannelNetworkAddress(),
    engine.getConfirmedBalance()
  ])

  logger.info(`Attempting to create channel with ${relayerAddress} on ${symbol} with ${balanceCommon}`, {
    balanceCommon,
    balance
  })

  const currentBalance = await engine.getTotalBalanceForAddress(relayerAddress)
  let balanceToCommit = Big(balance).minus(currentBalance)

  if (balanceToCommit.lte(0)) {
    logger.debug('Channels with sufficient balance already exist', { balance: currentBalance })
  } else {
    // Increase the balance of the final channel if it would be uneconomic
    const lastChannelBalance = balanceToCommit.mod(engine.maxChannelBalance)
    if (lastChannelBalance.gt(0) && lastChannelBalance.lt(MINIMUM_FUNDING_AMOUNT.times(engine.quantumsPerCommon))) {
      logger.error('Minimum channel balance would have resulted in an uneconomic channel.', { balanceToCommit, lastChannelBalance })

      if (lastChannelBalance.lte(engine.feeEstimate)) {
        balanceToCommit = balanceToCommit.minus(lastChannelBalance)
        logger.info('Ignoring tiny additional requested channel', { lastChannelBalance, balanceToCommit })
      } else {
        const lowCommitAmount = balanceToCommit.minus(lastChannelBalance)
        const highCommitAmount = lowCommitAmount.plus(MINIMUM_FUNDING_AMOUNT.times(engine.quantumsPerCommon))
        throw new Error('Committed balance would result in an uneconomic channel. ' +
          `Commit either ${lowCommitAmount.div(engine.quantumsPerCommon).toString()} ${symbol}` +
          `or ${highCommitAmount.div(engine.quantumsPerCommon).toString()} ${symbol}.`)
      }
    }

    // round up to find the number of channels needed to open.
    // @see: https://mikemcl.github.io/big.js/#round
    const channelsToOpen = balanceToCommit.div(engine.maxChannelBalance).round(0, 3)

    // ensure we have enough balance to support opening all the channels before opening any
    if (Big(unspentBalance).lt(balanceToCommit.plus(Big(engine.feeEstimate).times(channelsToOpen)))) {
      logger.error('Insufficient confirmed balance to open all channels.', { channelsToOpen, balanceToCommit, unspentBalance, symbol })
      throw new Error(`Insufficient balance (${Big(unspentBalance).div(engine.quantumsPerCommon)} ${symbol}) to ` +
        `commit amount: ${balanceToCommit.div(engine.quantumsPerCommon).toString()} ${symbol} (plus fees)`)
    }

    for (var i = 0; i < channelsToOpen; i++) {
      // Open max size channels until the last channel
      let channelAmount = balanceToCommit.gt(engine.maxChannelBalance) ? engine.maxChannelBalance : balanceToCommit.toString()
      balanceToCommit = balanceToCommit.minus(channelAmount)

      try {
        logger.info(`Opening outbound channel`, { relayerAddress, symbol, channelAmount, channelNum: i + 1 })
        await engine.createChannel(relayerAddress, channelAmount)
      } catch (e) {
        logger.error('Received error when creating outbound channel', { error: e.stack })
        throw new Error(`Funding error: ${e.message}`)
      }
    }
  }

  logger.debug(`Connecting to the relayer with inverse engine: ${inverseSymbol}`)

  // We want to make sure we are connected to the relayer on the inverseSymbol before
  // we ask the relayer to open a channel to us. This is to ensure that the relayer
  // knows about the engine and wont fail when creating a channel with us. Additionally,
  // this action allows our node to not have a public IP and ports opened
  await inverseEngine.connectUser(relayerInverseAddress)

  logger.debug('Creating inbound channels', { balance, symbol, inverseSymbol })

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
    throw new Error(`Error requesting inbound channels from Relayer: ${e.message}`)
  }

  return new EmptyResponse({})
}

module.exports = commit
