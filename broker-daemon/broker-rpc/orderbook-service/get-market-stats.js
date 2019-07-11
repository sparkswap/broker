const nano = require('nano-seconds')

const { BlockOrder, MarketEvent } = require('../../models')
const { Big } = require('../../utils')
const MarketStats = require('./market-stats')

/**
 * @constant
 * @type {Big}
 * @default
 */
const ONE_DAY_IN_NANOSECONDS = Big('86400000000000')

/**
 * Gets price ticker (stats) information about a specified market
 *
 * @param {object} request - request object
 * @param {object} request.params
 * @param {Logger} request.logger
 * @param {Map<Orderbook>} request.orderbooks
 * @param {object} responses
 * @param {Function} responses.GetMarketStatsResponse
 * @returns {Promise<GetMarketStatsResponse>}
 */
async function getMarketStats ({ params, logger, orderbooks }, { GetMarketStatsResponse }) {
  const { market } = params
  const orderbook = orderbooks.get(market)

  if (!orderbook) throw new Error(`${market} is not being tracked as a market.`)

  logger.debug(`Checking currency configurations for: ${market}`)

  const stats = new MarketStats(market)
  const currentTime = nano.now()
  const timestamp = nano.toString(currentTime)
  const datetime = nano.toISOString(currentTime)

  logger.debug('Grabbing data from orderbook')

  // We set the starttime of our query to 24 hours in the past from the current
  // timestamp
  const startTime = Big(timestamp).minus(ONE_DAY_IN_NANOSECONDS)
  const currentOrderbookEvents = await orderbook.getOrderbookEventsByTimestamp(startTime)
  const currentMarketEvents = await orderbook.getMarketEventsByTimestamp(startTime)

  logger.debug(`Generating market report for ${market}`, { currentTime })

  // We need to open up the orderbooks store and get all market events
  // and traverse them.
  // We grab the current asks from the past 24 hours and calculate
  // the best ask price and best ask amount (lowest sell)
  const currentAsks = currentOrderbookEvents.filter(e => e.side === BlockOrder.SIDES.ASK)
  const bestAskPrice = await stats.lowestPrice(currentAsks)
  const bestAskAmount = await stats.bestAskAmount(currentAsks)

  // We grab the current bids from the past 24 hours and calculate the best
  // bid price and best bid amount (highest bid)
  const currentBids = currentOrderbookEvents.filter(e => e.side === BlockOrder.SIDES.BID)
  const bestBidPrice = await stats.highestPrice(currentBids)
  const bestBidAmount = await stats.bestBidAmount(currentBids)

  // We only care about events that have been filled, because highest/lowest prices
  // and totals are only applicable for orders that are completed
  // TODO: Do we care about other events IE w/ fill amount?
  const filledMarketEvents = currentMarketEvents.filter(e => e.eventType === MarketEvent.TYPES.FILLED)

  // Grab the highest price for 24 hours
  const highestPrice = await stats.highestPrice(filledMarketEvents)

  // Grab the lowest price for 24 hours
  const lowestPrice = await stats.lowestPrice(filledMarketEvents)

  // Calculate vwap for last 24 hours (volume weighted average price)
  const vwap = await stats.vwap(filledMarketEvents)

  // Grab the total amount of base currency traded for the day - market events
  const totalBase = await stats.baseVolume(filledMarketEvents)

  // Grab the total amount of counter (quote) currency traded for the day - market events
  const totalCounter = await stats.counterVolume(filledMarketEvents)

  return new GetMarketStatsResponse({
    symbol: market,
    timestamp,
    datetime,
    high: highestPrice.toString(),
    low: lowestPrice.toString(),
    ask: bestAskPrice.toString(),
    askVolume: bestAskAmount.toString(),
    bid: bestBidPrice.toString(),
    bidVolume: bestBidAmount.toString(),
    vwap: vwap.toString(),
    baseVolume: totalBase.toString(),
    counterVolume: totalCounter.toString()
  })
}

module.exports = getMarketStats
