/**
 * Creates a stream with the exchange that watches for market events
 *
 * @param {GrpcServerStreamingMethod~request} request - request object
 * @param {Object} request.params - Request parameters from the client
 * @param {function} request.send - Send a chunk of data to the client
 * @param {Object} request.logger - logger for messages about the method
 * @param {RelayerClient} request.relayer - grpc Client for interacting with the relayer
 * @param {Object} responses
 * @param {function} responses.WatchMarketResponse - constructor for WatchMarketResponse messages
 * @return {void}
 */
async function watchMarket ({ params, send, logger, relayer }, { WatchMarketResponse }) {
  const { market } = params
  try {
    this.logger.info('WHAT THE ACTIALSDF FUCKSFSDFSDFG')
    this.orderbooks[market].all().forEach(order => send(order))
  } catch (e) {
    this.logger.error('watchMarket failed', { error: e.toString() })

    // Figure out a better way to handle errors for call
  }
}

module.exports = watchMarket
