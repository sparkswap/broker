const nano = require('nano-seconds')
const MarketEventOrder = require('../../models/market-event-order')

/**
 * Default limit for number of orders returned for each side of orderbook
 * @type {String}
 * @constant
 */
const DEFAULT_LIMIT = '50'

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

    // limitPerSide is passed as an integer with default protobuf value of '0', so '0' implies param was omitted
    const limitPerSide = (params.limitPerSide === '0') ? DEFAULT_LIMIT : params.limitPerSide

    const bids = await orderbook.getOrders({ side: MarketEventOrder.SIDES.BID, limit: limitPerSide })
    const asks = await orderbook.getOrders({ side: MarketEventOrder.SIDES.ASK, limit: limitPerSide })

    const formattedBids = []
    bids.forEach((bid) => formattedBids.push({price: bid.price, amount: bid.amount}))

    const formattedAsks = []
    asks.forEach((ask) => formattedAsks.push({price: ask.price, amount: ask.amount}))

    return new GetOrderbookResponse({timestamp, datetime, bids: formattedBids, asks: formattedAsks})
  } catch (err) {
    logger.error(`Failed to get orderbook: ${err.message}`)
    throw new Error(err)
  }
}

module.exports = getOrderbook
