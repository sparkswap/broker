const { Big } = require('../../utils')
const { currencies: currencyConfig } = require('../../config')

class MarketStats {
  /**
   * @param {String} market
   */
  constructor (market) {
    this.market = market
    this.baseSymbol = market.split('/')[0]
    this.counterSymbol = market.split('/')[1]

    const { quantumsPerCommon: baseQuantumsPerCommon } = currencyConfig.find(({ symbol: configSymbol }) => configSymbol === this.baseSymbol) || {}
    const { quantumsPerCommon: counterQuantumsPerCommon } = currencyConfig.find(({ symbol: configSymbol }) => configSymbol === this.counterSymbol) || {}

    if (!baseQuantumsPerCommon) throw new Error(`Currency was not found when trying to commit to market: ${this.baseSymbol}`)
    if (!counterQuantumsPerCommon) throw new Error(`Currency was not found when trying to commit to market: ${this.counterSymbol}`)

    this.baseQuantumsPerCommon = baseQuantumsPerCommon
    this.counterQuantumsPerCommon = counterQuantumsPerCommon
  }

  /**
   * Gets the highest price for a collection of events
   * @param {Array<MarketEventOrder>} events
   * @returns {Big}
   */
  async highestPrice (events = []) {
    return events.reduce((acc, event) => {
      const amount = Big(event.counterAmount).div(event.baseAmount)
      if (amount.gt(acc)) return amount
      return acc
    }, Big(0))
  }

  /**
   * Gets the lowest price for a collection of events
   * @param {Array<MarketEventOrder>} events
   * @returns {Big}
   */
  async lowestPrice (events = []) {
    return events.reduce((acc, event, idx) => {
      const amount = Big(event.counterAmount).div(event.baseAmount)
      // If this is the first element of the filledMarketEvents, then we need to set an initial
      // value, otherwise the lowestPrice would always be stuck to zero
      if (idx === 0) return amount
      if (amount.lt(acc)) return amount
      return acc
    }, Big(0))
  }

  /**
   * Calculates the vwap (volume weighted average price) for a collection of events
   * @param {Array<MarketEventOrder>} events
   * @returns {Big}
   */
  async vwap (events = []) {
    // VWAP Calculations - market events
    // 0.001 btc for 59.2
    // 0.002 btc for 59.3
    // multiple amount by unique price
    // then add up all BTC and divide by the cummulative price
    // price multiplied by amount
    const vwapTotalAmount = events.reduce((acc, event) => {
      return acc.plus(Big(event.counterAmount).times(event.baseAmount))
    }, Big(0))

    const vwapTotalShares = events.reduce((acc, event) => {
      // we multiply the baseAmount by itself so that we can normalize the vwap
      // based off of price
      return acc.plus(Big(event.baseAmount).times(event.baseAmount))
    }, Big(0))

    // There is the potential that these items can be zero if no events are passed
    // in. If this is the case, Big will error out because we are trying to divide
    // by zero. Instead we will just return Big(0)
    if (vwapTotalShares.eq(0)) {
      return Big(0)
    }

    return vwapTotalAmount.div(vwapTotalShares)
  }

  /**
   * Returns the best ask amount (lowest sell) from a collection of asks
   * @param {Array<MarketEventOrder>} asks
   * @returns {Big}
   */
  async bestAskAmount (asks = []) {
    return asks.reduce((acc, ask, idx) => {
      const amount = Big(ask.baseAmount).div(this.baseQuantumsPerCommon)
      // If this is the first element of the currentAsks, then we need to set an initial
      // value, otherwise the bestAskPrice would always be stuck to zero
      if (idx === 0) return amount
      if (amount.lt(acc)) return amount
      return acc
    }, Big(0))
  }

  /**
   * Returns the best bid amount (highest buy) from a collection of bids
   * @param {Array<MarketEventOrder>} bids
   * @returns {Big}
   */
  async bestBidAmount (bids = []) {
    return bids.reduce((acc, bid) => {
      const amount = Big(bid.baseAmount).div(this.baseQuantumsPerCommon)
      if (amount.gt(acc)) return amount
      return acc
    }, Big(0))
  }

  /**
   * Total volume traded of base currency for a collection of events
   * @param {Array<MarketEventOrder>} events
   * @returns {Big}
   */
  async baseVolume (events = []) {
    return events.reduce((acc, event) => {
      const amount = Big(event.baseAmount).div(this.baseQuantumsPerCommon)
      return acc.plus(amount)
    }, Big(0))
  }

  /**
   * Total volume traded of counter currency for a collection of events
   * @param {Array<MarketEventOrder>} events
   * @returns {Big}
   */
  async counterVolume (events = []) {
    return events.reduce((acc, event) => {
      const amount = Big(event.counterAmount).div(this.counterQuantumsPerCommon)
      return acc.plus(amount)
    }, Big(0))
  }
}

module.exports = MarketStats
