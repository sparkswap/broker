const { PublicError } = require('grpc-methods')

/**
 * Grabs public lightning network information from relayer and opens a channel
 *
 * @param {Object} request - request object
 * @param {Object} request.params
 * @param {String} request.params.market - Market name (e.g. BTC/LTC)
 * @param {Boolean} request.params.force - if channels should be force closed
 * @param {RelayerClient} request.relayer
 * @param {Logger} request.logger
 * @param {Engine} request.engines
 * @param {Map<Orderbook>} request.orderbooks
 * @param {Object} responses
 * @return {Object} responses.ReleaseChannelsResponse
 */
async function releaseChannels ({ params, logger, engines, orderbooks }, { ReleaseChannelsResponse }) {
  const { market, force } = params

  const orderbook = orderbooks.get(market)
  if (!orderbook) {
    throw new PublicError(`${market} is not being tracked as a market.`)
  }

  const [ baseSymbol, counterSymbol ] = market.split('/')

  const baseEngine = engines.get(baseSymbol)
  if (!baseEngine) {
    throw new PublicError(`No engine available for ${baseSymbol}`)
  }

  const counterEngine = engines.get(counterSymbol)
  if (!counterEngine) {
    throw new PublicError(`No engine available for ${counterSymbol}`)
  }

  // We want to try and close channels for both the base and counter engine
  // however if one of the engine calls fail, we would like to notify the user
  // but still attempt to close the other side of the market
  let errors = []

  try {
    const channels = await baseEngine.closeChannels({ force })
    logger.info(`Closed ${baseSymbol} channels`, { channels, force })
  } catch (e) {
    logger.error(`Failed to close ${baseSymbol} channels`, { force })
    errors.push(`Failed to release ${baseSymbol} channels. Reason: ${e}`)
  }

  try {
    const counterChannels = await counterEngine.closeChannels({ force })
    logger.info(`Closed ${counterSymbol} channels`, { counterChannels, force })
  } catch (e) {
    logger.error(`Failed to close ${counterSymbol} channels`, { force })
    errors.push(`Failed to release ${counterSymbol} channels. Reason: ${e}`)
  }

  return new ReleaseChannelsResponse({ errors })
}

module.exports = releaseChannels
