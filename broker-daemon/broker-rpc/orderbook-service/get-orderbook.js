const nano = require('nano-seconds')
const { Big } = require('../../utils')

/**
 * Default limit for number of orders returned for each side of orderbook
 * @type {Big}
 * @constant
 */
const DEFAULT_LIMIT = Big(50)

/**
 * Retrieve price and amount information for current orderbook state
 *
 * @param {GrpcUnaryMethod~request} request - request object
 * @param {Object} request.params - Request parameters from the client
 * @param {String} request.params.market - market symbol e.g. BTC/LTC
 * @param {String} request.params.limitPerSide - limit for number of orders for each side of orderbook
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
    logger.error(`${market} is not being tracked as a market.`)
    throw new Error(`${market} is not being tracked as a market.`)
  }
  try {
    const currentTime = nano.now()
    const timestamp = nano.toString(currentTime)
    const datetime = nano.toISOString(currentTime)
    const orders = await orderbook.all()

    // limitPerSide is passed as an integer with default protobuf value of '0', so '0' implies param was omitted
    const limitPerSide = (params.limitPerSide === '0') ? DEFAULT_LIMIT : Big(params.limitPerSide)

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

    // Bids are sorted in descending order so the best bid (i.e. highest bid) is returned first
    bids.sort((a, b) => parseFloat(b.price) - parseFloat(a.price)).splice(limitPerSide)

    // Asks are sorted in ascending order so best ask (i.e. lowest ask) is returned first
    asks.sort((a, b) => parseFloat(a.price) - parseFloat(b.price)).splice(limitPerSide)

    return new GetOrderbookResponse({timestamp, datetime, bids, asks})
  } catch (err) {
    logger.error(`Failed to get orderbook: ${err.message}`)
    throw new Error(err)
  }
}

module.exports = getOrderbook
