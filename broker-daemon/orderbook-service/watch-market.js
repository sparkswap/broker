const streamFunction = require('level-live-stream')
const bigInt = require('big-integer')
const neverResolve = new Promise(() => {})
/**
 * Creates a stream with the exchange that watches for market events
 *
 * @param {GrpcServerStreamingMethod~request} request - request object
 * @param {Object} request.params - Request parameters from the client
 * @param {function} request.send - Send a chunk of data to the client
 * @param {Object} request.logger - logger for messages about the method
 * @param {Object} request.orderbooks - initialized orderbooks
 * @param {RelayerClient} request.relayer - grpc Client for interacting with the relayer
 * @param {Object} responses
 * @param {function} responses.WatchMarketResponse - constructor for WatchMarketResponse messages
 * @return {void}
 */

async function watchMarket ({ params, send, logger, orderbooks }, { WatchMarketResponse }) {
  // TODO: Some validation on here. Maybe the client can call out for valid markets
  // from the relayer so we dont event make a request if it is invalid
  const { market } = params
  const orderbook = orderbooks.get(market)
  const liveStream = streamFunction(orderbook.store)
  liveStream
    .on('data', (opts) => {
      if (opts === undefined) {
        logger.info('Undefined event in the stream, likely from a delete event')
        // do nothing right now, this is a side effect of deleting a record from the DB
      } else if (opts.type && opts.type === 'del') {
        logger.info(`Delete event in the stream, info: ${opts}`)
        // do nothing right now (we will need to figure out what to send to the cli so that it resets all the records)
      } else if (opts.key && opts.key === 'sync') {
        logger.info('Sync event signifying end of old events being added to stream, following events are new')
        // also do nothing right now ({sync: true} is part of level stream, it is added to the stream after all
        // old events have been added to the streak before any new events are added to the stream.)
      } else {
        logger.info(`New event being added to stream, event info: ${opts}`)
        const parsedValue = JSON.parse(opts.value)
        send(new WatchMarketResponse(bigInt(parsedValue.baseAmount), bigInt(parsedValue.counterAmount), parsedValue.side))
      }
    })

  await neverResolve
}

module.exports = watchMarket
