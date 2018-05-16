const neverResolve = new Promise(() => {})

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
  // TODO: Some validation on here. Maybe the client can call out for valid markets
  // from the relayer so we dont event make a request if it is invalid
  const { market } = params
  const [baseSymbol, counterSymbol] = market.split('/')

  // TODO: Rethink the lastUpdated null value for relayer
  const request = { baseSymbol, counterSymbol, lastUpdated: 0 }

  const watchOrder = await relayer.watchMarket(request)

  watchOrder.on('data', (order) => send(new WatchMarketResponse(order)))
  watchOrder.on('end', () => logger.info('Finished sending'))

  // We want to keep this stream open, so we `await` a promise that will never resolve
  await neverResolve
}

module.exports = watchMarket
