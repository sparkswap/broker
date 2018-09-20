const nanoToDatetime = require('../../utils/nano-to-datetime')
/**
 * Retrieve price and amount information for current orderbook state
 *
 * @param {GrpcUnaryMethod~request} request - request object
 * @param {Object} request.params - Request parameters from the client
 * @param {Object} request.logger
 * @param {Map<Orderbook>} request.orderbooks
 * @param {Object} responses
 * @param {function} responses.GetOrderbookResponse - constructor for GetOrderbookResponse messages
 * @return {responses.GetOrderbookResponse}
 */
async function getOrderbook ({ params, logger, orderbooks }, { GetOrderbookResponse }) {
  const { market } = params
  const orderbook = orderbooks.get(market)

  if (!orderbook) {
    throw new Error(`${market} is not being tracked as a market.`)
  }
  try {
    const timestamp = new Date().getTime()
    const orders = await orderbook.all()

    const bids = []
    const asks = []
    orders.forEach((order) => {
      const orderInfo = {price: order.price, amount: order.amount}
      if (order.side === 'BID') {
        bids.push(orderInfo)
      } else {
        asks.push(orderInfo)
      }
    })

    const datetimeInNano = (orders[orders.length - 1] || {}).createdAt
    const datetime = nanoToDatetime(datetimeInNano)
    return new GetOrderbookResponse({timestamp, datetime, bids, asks})
  } catch (err) {
    throw new Error(err.message)
  }
}

module.exports = getOrderbook
