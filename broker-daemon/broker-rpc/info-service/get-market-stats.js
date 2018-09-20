const nano = require('nano-seconds')
const { PublicError } = require('grpc-methods')

const { MarketEvent, BlockOrder } = require('../../models')
const { getRecords, Big } = require('../../utils')
const { currencies: currencyConfig } = require('../../config')

/**
 * @constant
 * @type {Big}
 * @default
 */
const ONE_DAY_IN_NANOSECONDS = Big('86400000000000')

/**
 *
 * @param {Big} acc
 * @param {MarketEventOrder} event
 * @returns {Big}
 */
function bestBaseAmount (acc, event) {
  if (acc.lt(event.baseAmount)) {
    acc = Big(event.baseAmount)
  }
  return acc
}

/**
 *
 * @param {Big} acc
 * @param {MarketEventOrder} event
 * @returns {Big}
 */
function bestCounterAmount (acc, event) {
  if (acc.lt(event.counterAmount)) {
    acc = Big(event.counterAmount)
  }
  return acc
}

/**
 *
 * @param {Big} acc
 * @param {MarketEventOrder} event
 * @param {Number} idx
 * @returns {Big}
 */
function worstCounterAmount (acc, event, idx) {
  // If this is the first element, we can set the accumulator to the counter
  // amount and continue so that we have a value to compare against
  if (idx === 0) {
    acc = Big(event.counterAmount)
    return acc
  }

  if (acc.gt(event.counterAmount)) {
    acc = Big(event.counterAmount)
  }
  return acc
}

/**
 * Gets price ticker (stats) information about a specified market
 *
 * @param {Object} request - request object
 * @param {Object} request.params
 * @param {Logger} request.logger
 * @param {Map<Orderbook>} request.orderbooks
 * @param {Object} responses
 * @param {function} responses.GetMarketStatsResponse
 * @return {GetMarketStatsResponse}
 */
async function getMarketStats ({ params, relayer, logger, orderbooks }, { GetMarketStatsResponse }) {
  const { market } = params
  const orderbook = orderbooks.get(market)
  const [baseSymbol, counterSymbol] = market.split('/')

  logger.debug(`Checking currency configurations for: ${market}`)

  // Get quantumsPerCommon for both currencies or fail, as we need these to calculate
  // the correct amounts
  const { quantumsPerCommon: baseQuantumsPerCommon } = currencyConfig.find(({ symbol: configSymbol }) => configSymbol === baseSymbol) || {}
  const { quantumsPerCommon: counterQuantumsPerCommon } = currencyConfig.find(({ symbol: configSymbol }) => configSymbol === counterSymbol) || {}

  if (!baseQuantumsPerCommon) throw new PublicError(`Invalid configuration: missing quantumsPerCommon for ${baseSymbol}`)
  if (!counterQuantumsPerCommon) throw new PublicError(`Invalid configuration: missing quantumsPerCommon for ${counterSymbol}`)
  if (!orderbook) throw new PublicError(`${market} is not being tracked as a market.`)

  const currentTime = nano.now()
  const timestamp = nano.toString(currentTime)
  const datetime = nano.toISOString(currentTime)

  logger.debug(`Generating market report for ${market}`, { currentTime })

  // We set the starttime of our query to 24 hours in the past from the current
  // timestamp
  const startTime = Big(timestamp).minus(ONE_DAY_IN_NANOSECONDS)

  // We need to open up the orderbooks store and get all market events
  // and traverse them.
  // Not sure how exactly we will do a query
  // const liveStream = createLiveStream(orderbook.store)
  const currentOrderbookEvents = await getRecords(
    orderbook.store,
    (key, value) => JSON.parse(value),
    // Limits the query to a 24 hour period
    MarketEvent.rangeFromTimestamp(startTime)
  )

  const currentAsks = currentOrderbookEvents.filter(e => e.side === BlockOrder.SIDES.ASK)
  const currentBids = currentOrderbookEvents.filter(e => e.side === BlockOrder.SIDES.BID)

  // Grab the best ask, orderbook
  const bestAskAmount = currentAsks.reduce(bestBaseAmount, Big(0))

  // Grab the best ask's price, orderbook
  const bestAskPrice = currentAsks.reduce(bestCounterAmount, Big(0))

  // Grab the best bid, orderbook
  const bestBidAmount = currentBids.reduce(bestBaseAmount, Big(0))

  // Grab the best bid's price, orderbook
  const bestBidPrice = currentBids.reduce(bestCounterAmount, Big(0))

  // Grab the highest price for 24 hours, requires market events
  // Grab the lowest price for 24 hours, requires market events
  //
  const currentMarketEvents = await getRecords(
    orderbook.eventStore,
    (key, value) => JSON.parse(value),
    // Limits the query to a 24 hour period
    MarketEvent.rangeFromTimestamp(startTime)
  )

  // Because of the stats that we need to generate using currentMarketEvents, we only
  // care about events that have actually been filled
  // TODO: Do we care about other events IE w/ fill amount?
  // const filledMarketEvents = currentMarketEvents.filter(e => e.eventType === MarketEvent.TYPES.FILLED)
  const filledMarketEvents = currentMarketEvents

  const highestPrice = filledMarketEvents.reduce(bestCounterAmount, Big(0))
  const lowestPrice = filledMarketEvents.reduce(worstCounterAmount, Big(0))

  // VWAP Calculations - market events
  // 0.001 btc for 59.2
  // 0.002 btc for 59.3
  // multiple amount by unique price
  // then add up all BTC and divide by the cummulative price
  // price multiplied by amount
  const [vwapTotalAmount, vwapTotalShares] = filledMarketEvents.reduce(([amount, shares], event) => {
    return [
      amount.plus(Big(event.counterAmount).times(event.baseAmount)),
      shares.plus(event.baseAmount)
    ]
  }, [Big(0), Big(0)])

  const vwap = vwapTotalAmount.div(vwapTotalShares)

  // Grab the total amount of base currency traded for the day - market events
  const totalBase = filledMarketEvents.reduce((acc, event) => {
    return acc.plus(event.baseAmount)
  }, Big(0))

  // Grab the total amount of counter (quote) currency traded for the day - market events
  const totalCounter = filledMarketEvents.reduce((acc, event) => {
    return acc.plus(event.counterAmount)
  }, Big(0))

  // TODO: We are currently missing the following open/close pricing because we do not allow
  // the user to specify a datetime for the price ticket (we only return the previous 24 hours)
  // Once time ranges have been implemented we will need to add the following fields:
  //
  // - open (opening price, 00:01 of day)
  // - close (closing price, 23:59 of day)
  // - last (same as close, but both terms are used)
  // - previousClose (closing price of previous day)
  // - change (last - open)
  // - percentage (change/open * 100)
  // - average (last + open / 2)
  return {
    symbol: market,
    timestamp,
    datetime,
    high: highestPrice.div(counterQuantumsPerCommon).toString(),
    low: lowestPrice.div(counterQuantumsPerCommon).toString(),
    ask: bestAskAmount.div(baseQuantumsPerCommon).toString(),
    askVolume: bestAskPrice.div(counterQuantumsPerCommon).toString(),
    bid: bestBidAmount.div(baseQuantumsPerCommon).toString(),
    bidVolume: bestBidPrice.div(counterQuantumsPerCommon).toString(),
    vwap: vwap.div(counterQuantumsPerCommon).toString(),
    baseVolume: totalBase.div(baseQuantumsPerCommon).toString(),
    counterVolume: totalCounter.div(counterQuantumsPerCommon).toString()
  }
}

module.exports = getMarketStats
