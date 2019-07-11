const { Big } = require('../../utils')

/**
 * Relevant fragment of the message generated on LND Engine when our
 * request to create channels would result in no channels being created
 * because the amount is too small (LND Engine avoids opening tiny channels
 * as they are uneconomic.)
 *
 * @see https://github.com/sparkswap/lnd-engine/pull/217
 * @see https://github.com/sparkswap/lnd-engine/blob/v0.5.4-beta-rc2/src/engine-actions/create-channels.js#L67
 * @type {string}
 * @constant
 */
const SMALL_CHAN_ERR = 'too small'

/**
 * Grabs public lightning network information from relayer and opens a channel
 *
 * @param {object} request - request object
 * @param {object} request.params
 * @param {RelayerClient} request.relayer
 * @param {Logger} request.logger
 * @param {Engine} request.engines
 * @param {object} responses
 * @param {Function} responses.EmptyResponse
 * @returns {Promise<EmptyResponse>}
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

  // Collect all remote information
  const [
    { address: relayerAddress },
    { address: relayerInverseAddress },
    outboundPaymentChannelNetworkAddress,
    inboundPaymentChannelNetworkAddress
  ] = await Promise.all([
    relayer.paymentChannelNetworkService.getAddress({ symbol }),
    relayer.paymentChannelNetworkService.getAddress({ symbol: inverseSymbol }),
    engine.getPaymentChannelNetworkAddress(),
    inverseEngine.getPaymentChannelNetworkAddress()
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
    try {
      logger.info(`Opening outbound channels`, {
        relayerAddress,
        symbol,
        balanceToCommit: balanceToCommit.toString()
      })
      await engine.createChannels(relayerAddress, balanceToCommit.toString())
    } catch (e) {
      logger.error('Received error when creating outbound channel', { error: e.stack })

      if (e.message && e.message.includes(SMALL_CHAN_ERR) && Big(currentBalance).gt(0)) {
        logger.debug('Suppressing error from not creating channels since it is likely we are re-committing a previous amount', {
          balanceToCommit: balanceToCommit.toString(),
          balance
        })
      } else {
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
