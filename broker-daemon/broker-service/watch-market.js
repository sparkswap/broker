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

async function watchMarket ({ params, send, logger, relayer, orderbooks }, { WatchMarketResponse }) {
  // TODO: Some validation on here. Maybe the client can call out for valid markets
  // from the relayer so we dont event make a request if it is invalid
  const { market } = params
  const records = await orderbooks[market].all()

  records.forEach(order => {
    send(new WatchMarketResponse(parseFloat(order.baseAmount), parseFloat(order.counterAmount), order.side))
  })
}

module.exports = watchMarket
