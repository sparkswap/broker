const createLiveStream = require('level-live-stream')
const { MarketEventOrder } = require('../../models')

/**
 * Promise that never resolves to keep open the watchMarket stream
 * so our gRPC calls do not return early
 * @constant
 * @type {Promise}
 * @default
 */
const neverResolve = new Promise(() => {})

/**
 * Creates a stream with the exchange that watches for market events
 *
 * @function
 * @param {GrpcServerStreamingMethod~request} request - request object
 * @param {Object} request.params - Request parameters from the client
 * @param {Function} request.send - Send a chunk of data to the client
 * @param {Function} request.onCancel - Handle cancelled streams
 * @param {Function} request.onError - Handle errored streams
 * @param {Object} request.logger - logger for messages about the method
 * @param {Object} request.orderbooks - initialized orderbooks
 * @param {RelayerClient} request.relayer - grpc Client for interacting with the relayer
 * @param {Object} responses
 * @param {Function} responses.WatchMarketResponse - constructor for WatchMarketResponse messages
 * @returns {void}
 */
async function watchMarket ({ params, send, onCancel, onError, logger, orderbooks }, { WatchMarketResponse }) {
  // TODO: Some validation on here. Maybe the client can call out for valid markets
  // from the relayer so we dont event make a request if it is invalid
  const { market } = params
  const orderbook = orderbooks.get(market)

  if (!orderbook) {
    throw new Error(`${market} is not being tracked as a market.`)
  }

  const liveStream = createLiveStream(orderbook.store)

  /**
   * Send market events to clients when records are added/deleted in the orderbook data store
   * @param  {Object}  opts       - Database operation from LevelDb
   * @param  {string}  opts.key   - Key of the database object
   * @param  {string}  opts.value - Value of the database object
   * @returns {void}
   */
  const onData = (opts) => {
    if (opts.type === 'put') {
      params = {
        marketEvent: MarketEventOrder.fromStorage(opts.key, opts.value).serialize()
      }
      send(new WatchMarketResponse(params))
    }
  }

  onCancel(() => liveStream.removeListener('data', onData))
  onError(() => liveStream.removeListener('data', onData))

  liveStream
    .on('data', onData)

  await neverResolve
}

module.exports = watchMarket
