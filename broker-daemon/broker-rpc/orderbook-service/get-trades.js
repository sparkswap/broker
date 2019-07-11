const { MarketEvent } = require('../../models')
const {
  Big,
  GrpcResponse: GetTradesResponse
} = require('../../utils')

/** @typedef {import('../broker-rpc-server').GrpcUnaryMethodRequest} GrpcUnaryMethodRequest */

/**
 * Default limit for number of records returned per call
 * @type {typeof Big}
 * @constant
 */
const DEFAULT_LIMIT = Big(50)

/**
 * Retrieve information about trades (filled orders) since a specified date.
 *
 * @param {GrpcUnaryMethodRequest} request - request object
 * @returns {Promise<GetTradesResponse>}
 */

async function getTrades ({ params, logger, orderbooks }) {
  try {
    const { market, since } = params
    const orderbook = orderbooks.get(market.toUpperCase())

    if (!orderbook) {
      logger.error(`${market} is not being tracked as a market.`)
      throw new Error(`${market} is not being tracked as a market.`)
    }

    // limit is passed as an integer so even if undefined it gets passed as '0', we can assume the limit should not be 0
    const limit = (params.limit === '0') ? DEFAULT_LIMIT : Big(params.limit)

    logger.info(`Fetching trades for ${market} since ${since}, limit: ${limit}`)
    const trades = await orderbook.getTrades(since, limit)
    logger.info(`Formatting trades for ${market} since ${since}, limit: ${limit}`)
    const formattedTrades = trades.filter(trade => trade.eventType === MarketEvent.TYPES.FILLED).map(t => t.tradeInfo(market))
    return new GetTradesResponse({ trades: formattedTrades })
  } catch (err) {
    logger.error('Received error when grabbing trades', { error: err.stack })
    throw new Error(err.message)
  }
}

module.exports = getTrades
