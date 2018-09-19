const nano = require('nano-seconds')

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
async function getMarketStats ({ params, logger, orderbooks }, { GetMarketStatsResponse }) {
  const { market } = params
  const orderbook = orderbooks.get(market)

  if (!orderbook) throw new Error(`${market} is not being tracked as a market.`)

  const currentTime = nano.now()
  const timestamp = nano.toString(currentTime)
  const datetime = nano.toISOString(currentTime)

  // We need to open up the orderbooks store and get all market events
  // and traverse them.
  // Not sure how exactly we will do a query
  // const liveStream = createLiveStream(orderbook.store)

  // We can look at code like this to make a query based off of IDs timestamps and sequences
  // gte: timestamp
  // lte: timestamp
  // const fills = await FillStateMachine.getAll(
  //   { store: this.fillsStore, logger },
  //   // limit the fills we retrieve to those that belong to this blockOrder, i.e. those that are in
  //   // its prefix range.
  //   Fill.rangeForBlockOrder(blockOrder.id)
  // )

  // Grab the highest price for 24 hours, requires market events
  // Grab the lowest price for 24 hours, requires market events
  // Grab the best bid, orderbook
  // Grab the best bid's price, orderbook
  // Grab the best ask, orderbook
  // Grab the best ask's price, orderbook

  // VWAP Calculations - market events
  // 0.001 btc for 59.2
  // 0.002 btc for 59.3
  // multiple amount by unique price
  // then add up all BTC and divide by the cummulative price

  // Grab the total amount of btc for the day - market events
  // Grab the total amount of ltc traded for the day - market events

  return {
    symbol: market,
    timestamp,
    datetime,
    high: '59.313',
    low: '59.212',
    bid: '0.0001',
    bidVolume: '59.311',
    ask: '0.0001',
    askVolume: '59.32',
    vwap: '59.324',
    baseVolume: '20.1233',
    counterVolume: '1207.398'
  }
}

module.exports = getMarketStats
