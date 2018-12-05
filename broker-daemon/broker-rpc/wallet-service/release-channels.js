const { PublicError } = require('grpc-methods')

const RELEASE_CHANNEL_STATUSES = Object.freeze({
  OK: 'OK',
  FAILED: 'FAILED',
  NO_ACTION: 'NO ACTION'
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

  if (symbols.length > 2) throw new Error('we have an issa')

  const releaseChannelPromises = symbols.map(async (symbol) => {
    const engine = engines.get(symbol)

    if (!engine) throw new PublicError(`No engine available for ${symbol}`)

    try {
      const channels = await engine.closeChannels({ force })

      logger.info(`Closed ${symbol} channels`, { channels, force })

      let status = RELEASE_CHANNEL_STATUSES.OK

      // If no channels were returned from the `closeChannels` call then we can
      // assume that all funds have been released from this specific engine
      if (channels) {
        status = RELEASE_CHANNEL_STATUSES.NO_ACTION
      }

      return {
        symbol,
        status,
        error: false
      }
    } catch (e) {
      logger.error(`Failed to release channels for ${symbol}`, { force, error: e.toString() })

      return {
        symbol,
        status: `${RELEASE_CHANNEL_STATUSES.FAILED}: ${e.toString()}`,
        error: true
      }
    }
  })

  // We want to try and close channels for both the base and counter engine
  // however if one of the engine calls fail, we would like to notify the user
  // but still attempt to close the other side of the market
  //
  // We will construct a channel payload which allows us to send detailed information
  // to the consumer on the status of channels
  const channels = await Promise.all(releaseChannelPromises)

  return new ReleaseChannelsResponse({ channels })
}

module.exports = releaseChannels
