/**
 * Retrieve information about trades (filled orders) since a specified date.
 *
 * @param {GrpcUnaryMethod~request} request - request object
 * @param {Object} request.params - Request parameters from the client
 * @param {String} request.params.market - market symbol e.g. BTC/LTC
 * @param {String} request.params.since - ISO8601 millisecond timestamp
 * @param {String} request.params.limit
 * @param {Object} request.logger
 * @param  {Map<String, Orderbook>} request.orderbooks Collection of all active Orderbooks
 * @param {Object} responses
 * @param {function} responses.GetTradesResponse - constructor for GetTradesResponse messages
 * @return {responses.GetTradesResponse}
 */

async function getTradeHistory ({ params, logger, blockOrderWorker }, { GetTradesResponse }) {
  try {
    const { orders, fills } = await blockOrderWorker.getTrades()
    const filteredOrders = orders.filter(order => order.state === 'completed' || order.state === 'executing')
    const filteredFills = fills.filter(fill => fill.state === 'accepted' || fill.state === 'executed')

    return new GetTradesResponse({
      orders: filteredOrders,
      fills: filteredFills
    })
  } catch (err) {
    logger.error('Received error when grabbing trades', { error: err.stack })
    throw new Error(err.message)
  }
}

module.exports = getTradeHistory
