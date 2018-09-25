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
 * @param  {Map<String, Orderbook>} options.orderbooks Collection of all active Orderbooks
 * @param {Object} request.logger
 * @param {Object} responses
 * @param {function} responses.GetTradesResponse - constructor for GetTradesResponse messages
 * @return {responses.GetTradesResponse}
 */

async function getTrades ({ params, logger, orderbooks }, { GetTradesResponse }) {
  try {
    const { market, since, limit = DEFAULT_LIMIT } = params
    const orderbook = orderbooks.get(market)
    if (!orderbook) {
      logger.error(`${market} is not being tracked as a market.`)
      throw new Error(`${market} is not being tracked as a market.`)
    }

    logger.info(`Fetching trades for ${market} since ${since}, limit: ${limit}`)
    const trades = await orderbook.getTrades(since, limit)
    logger.info(`Formatting trades for ${market} since ${since}, limit: ${limit}`)
    const formattedTrades = trades.filter(trade => trade.eventType === MarketEvent.TYPES.FILLED).map(t => t.tradeInfo(market))
    return new GetTradesResponse({trades: formattedTrades})
  } catch (err) {
    throw new Error(err.message)
  }
}

module.exports = getTrades
