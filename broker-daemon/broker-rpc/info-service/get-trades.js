const { MarketEvent } = require('../../models')
const { Big } = require('../../utils')

/**
 * Default limit for number of records returned per call
 * @type {Integer}
 * @constant
 */
const DEFAULT_LIMIT = Big(50)

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

async function getTrades ({ params, logger, orderbooks }, { GetTradesResponse }) {
  try {
    const { market, since } = params
    const orderbook = orderbooks.get(market.toUpperCase())

    if (!orderbook) {
      logger.error(`${market} is not being tracked as a market.`)
      throw new Error(`${market} is not being tracked as a market.`)
    }

    // limit is passed as an integer so even if undefined it gets passed as '0', we can assume the limit should not be 0
    const limit = (params.limit === '0' || params.limit === undefined) ? DEFAULT_LIMIT : Big(params.limit)

    logger.info(`Fetching trades for ${market} since ${since}, limit: ${limit}`)
    const trades = await orderbook.getTrades(since, limit)
    logger.info(`Formatting trades for ${market} since ${since}, limit: ${limit}`)
    const formattedTrades = trades.filter(trade => trade.eventType === MarketEvent.TYPES.FILLED).map(t => t.tradeInfo(market))
    return new GetTradesResponse({trades: formattedTrades})
  } catch (err) {
    logger.error('Received error when grabbing trades', { error: err.stack })
    throw new Error(err.message)
  }
}

module.exports = getTrades
