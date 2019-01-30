const nano = require('nano-seconds')
const MarketEventOrder = require('../../models/market-event-order')

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
    let limitPerSide
    if (params.limitPerSide !== '0') {
      limitPerSide = params.limitPerSide
    }

    const bids = await orderbook.getOrders({ side: MarketEventOrder.SIDES.BID, limit: limitPerSide })
    const asks = await orderbook.getOrders({ side: MarketEventOrder.SIDES.ASK, limit: limitPerSide })

    const formattedBids = bids.map(bid => { return { price: bid.price, amount: bid.amount } })
    const formattedAsks = asks.map(ask => { return { price: ask.price, amount: ask.amount } })

    return new GetOrderbookResponse({timestamp, datetime, bids: formattedBids, asks: formattedAsks})
  } catch (err) {
    logger.error(`Failed to get orderbook: ${err.message}`)
    throw new Error(err)
  }
}

module.exports = getOrderbook
