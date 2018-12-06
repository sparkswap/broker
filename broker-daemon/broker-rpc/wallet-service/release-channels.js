const { PublicError } = require('grpc-methods')

/**
 * @constant
 * @type {Object}
 * @default
 */
const RELEASE_STATE = Object.freeze({
  RELEASED: 'RELEASED',
  FAILED: 'FAILED'
})
/**
 * Close channels on a specific engine
 *
 * @see {RELEASE_STATE}
 * @param {Engine} engine
 * @param {String} symbol - e.g. BTC or LTC
 * @param {Boolean} force
 * @param {Logger} logger
 * @returns {Object} res
 * @returns {String} res.symbol
 * @returns {String} res.status - RELEASED or FAILED
 * @returns {String} [res.error=undefined] - only present if status is FAILED
 */
async function closeChannels (engine, symbol, force, logger) {
  try {
    const channels = await engine.closeChannels({ force })

    logger.info(`Closed ${symbol} channels`, { channels, force })

    return {
      symbol,
      status: RELEASE_STATE.RELEASED
    }
  } catch (e) {
    logger.error(`Failed to release channels for ${symbol}`, { force, error: e.toString() })

    return {
      symbol,
      status: RELEASE_STATE.FAILED,
      error: e.message
    }
  }
}

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

  const [baseSymbol, counterSymbol] = market.split('/')

  const baseEngine = engines.get(baseSymbol)
  const counterEngine = engines.get(counterSymbol)

  if (!baseEngine) throw new PublicError(`No engine available for ${baseSymbol}`)
  if (!counterEngine) throw new PublicError(`No engine available for ${counterSymbol}`)

  // We want to try and close channels for both the base and counter engines
  // however if one of the engines fail to release channel, instead of failing
  // the gRPC call, we would like to notify the user through the `status` and `error`
  // properties of the ReleaseChannelsResponse.
  const [base, counter] = await Promise.all([
    closeChannels(baseEngine, baseSymbol, force, logger),
    closeChannels(counterEngine, counterSymbol, force, logger)
  ])

  return new ReleaseChannelsResponse({
    base,
    counter
  })
}

module.exports = releaseChannels
