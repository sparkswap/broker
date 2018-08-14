const { PublicError } = require('grpc-methods')

/**
 * Grabs public lightning network information from relayer and opens a channel
 *
 * @param {Object} request - request object
 * @param {Object} request.params
 * @param {RelayerClient} request.relayer
 * @param {Logger} request.logger
 * @param {Engine} request.engines
 * @param {Map<Orderbook>} request.orderbooks
 * @param {Object} responses
 * @return {Object} empty object
 */
async function releaseChannels ({ params, relayer, logger, engines, orderbooks }) {
  const { market } = params
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

  const channels = await baseEngine.closeChannels()
  logger.info(`Closed ${baseSymbol} channels: ${channels}`)

  const counterChannels = await counterEngine.closeChannels()
  logger.info(`Closed ${counterSymbol} channels: ${counterChannels}`)

  return {}
}

module.exports = releaseChannels
