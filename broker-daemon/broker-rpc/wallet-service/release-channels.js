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

  const symbols = market.split('/')

  // We want to try and close channels for both the base and counter engines
  // however if one of the engines fail to release channel, instead of failing
  // the gRPC call, we would like to notify the user through the `status` and `error`
  // properties of the ReleaseChannelsResponse and continue execution
  const releaseChannelPromises = symbols.map(async (symbol) => {
    const engine = engines.get(symbol)

    if (!engine) {
      throw new PublicError(`No engine available for ${symbol}`)
    }

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
        error: e.toString()
      }
    }
  })

  const channels = await Promise.all(releaseChannelPromises)

  return new ReleaseChannelsResponse({ channels })
}

module.exports = releaseChannels
