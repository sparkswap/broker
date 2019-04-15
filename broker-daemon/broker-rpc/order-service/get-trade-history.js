/**
 * Retrieve information about completed trades
 *
 * @param {GrpcUnaryMethod~request} request - request object
 * @param {Object} request.logger
 * @param {BlockOrderWorker} request.blockOrderWorker
 * @param {Object} responses
 * @param {function} responses.GetTradeHistoryResponse - constructor for GetTradeHistoryResponse messages
 * @return {responses.GetTradeHistoryResponse}
 */

async function getTradeHistory ({ logger, blockOrderWorker }, { GetTradeHistoryResponse }) {
  try {
    const { orders, fills } = await blockOrderWorker.getTrades()

    const filteredOrders = orders.filter(order => order.state === 'completed' || order.state === 'executing')
    const filteredFills = fills.filter(fill => fill.state === 'accepted' || fill.state === 'executed')

    return new GetTradeHistoryResponse({
      orders: filteredOrders,
      fills: filteredFills
    })
  } catch (err) {
    logger.error('Received error when grabbing trades', { error: err.stack })
    throw new Error(err.message)
  }
}

module.exports = getTradeHistory
