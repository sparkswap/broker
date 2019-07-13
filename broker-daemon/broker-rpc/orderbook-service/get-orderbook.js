const nano = require('nano-seconds')
const { SIDES } = require('../../models/market-event-order')
const { GrpcResponse: GetOrderbookResponse } = require('../../utils')

/** @typedef {import('../broker-rpc-server').GrpcUnaryMethodRequest} GrpcUnaryMethodRequest */

/**
 * Retrieve price and amount information for current orderbook state
 *
 * @param {GrpcUnaryMethodRequest} request - request object
 * @returns {Promise<GetOrderbookResponse>}
 */
async function getOrderbook ({ params, logger, orderbooks }) {
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

    const bids = await orderbook.getOrders({ side: SIDES.BID, limit: limitPerSide })
    const asks = await orderbook.getOrders({ side: SIDES.ASK, limit: limitPerSide })

    const formattedBids = bids.map(bid => { return { price: bid.price, amount: bid.amount } })
    const formattedAsks = asks.map(ask => { return { price: ask.price, amount: ask.amount } })

    return new GetOrderbookResponse({ timestamp, datetime, bids: formattedBids, asks: formattedAsks })
  } catch (err) {
    logger.error(`Failed to get orderbook: ${err.message}`)
    throw new Error(err)
  }
}

module.exports = getOrderbook
