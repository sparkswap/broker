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
 * @return {Object} empty object
 */
async function releaseChannels ({ params, logger, engines, orderbooks }, { EmptyResponse }) {
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

  const channels = await baseEngine.closeChannels({ force })
  logger.info(`Closed ${baseSymbol} channels`, { channels, force })

  const counterChannels = await counterEngine.closeChannels({ force })
  logger.info(`Closed ${counterSymbol} channels`, { counterChannels, force })

  return new EmptyResponse({})
}

module.exports = releaseChannels
