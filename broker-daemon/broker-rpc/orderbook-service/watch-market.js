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
 * @param {Object} request.logger - logger for messages about the method
 * @param {Object} request.orderbooks - initialized orderbooks
 * @param {RelayerClient} request.relayer - grpc Client for interacting with the relayer
 * @param {Object} responses
 * @param {Function} responses.WatchMarketResponse - constructor for WatchMarketResponse messages
 * @returns {void}
 */
async function watchMarket ({ params, send, onCancel, logger, orderbooks }, { WatchMarketResponse }) {
  // TODO: Some validation on here. Maybe the client can call out for valid markets
  // from the relayer so we dont event make a request if it is invalid
  const { market } = params
  const orderbook = orderbooks.get(market)

  if (!orderbook) {
    throw new Error(`${market} is not being tracked as a market.`)
  }

  const liveStream = createLiveStream(orderbook.store)
  const DB_ACTIONS = { DELETE: 'del', ADD: 'put' }

  /**
   * Send market events to clients when records are added/deleted in the orderbook data store
   * @param  {Object}  opts       - Database operation from LevelDb
   * @param  {string}  opts.type  - type of database operation, i.e. `put` or `del`
   * @param  {string}  opts.key   - Key of the database object being `put`ed or `del`ed
   * @param  {string}  opts.value - Value of the database object to be `put` (undefined for `del`)
   * @param  {boolean} opts.sync  - Flag from level-live-stream indicating that the stream is caught up to the present
   * @returns {void}
   */
  const onData = (opts) => {
    if (opts === undefined) {
      logger.info('Undefined event in the stream, likely from a delete event')
      // do nothing right now, this is a side effect of deleting a record from the DB
    } else if (opts.sync) {
      logger.info('Sync event signifying end of old events being added to stream, following events are new')
      // also do nothing right now ({sync: true} is part of level stream, it is added to the stream after all
      // old events have been added to the stream before any new events are added to the stream.)
    } else {
      logger.info('New event being added to stream, event info', opts)
      if (opts.type === DB_ACTIONS.DELETE) {
        params = {
          type: WatchMarketResponse.EventType.DELETE,
          marketEvent: { orderId: opts.key }
        }
      } else {
        params = {
          type: WatchMarketResponse.EventType.ADD,
          marketEvent: MarketEventOrder.fromStorage(opts.key, opts.value).serialize()
        }
      }
      send(new WatchMarketResponse(params))
    }
  }

  onCancel(() => liveStream.removeListener('data', onData))

  liveStream
    .on('data', onData)

  await neverResolve
}

module.exports = watchMarket
