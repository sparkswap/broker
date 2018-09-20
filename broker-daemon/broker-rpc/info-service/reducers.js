const { Big } = require('../../utils')
const { currencies: currencyConfig } = require('../../config')

class Reducers {
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

  askVolume (acc, event, idx) {
    console.log(this)
    const amount = Big(event.baseAmount).div(quantums)
    // If this is the first element of the currentAsks, then we need to set an initial
    // value, otherwise the bestAskPrice would always be stuck to zero
    if (idx === 0) return amount
    if (amount.lt(acc)) return amount
    return acc
  }

  bidVolume (acc, event) {
    const amount = Big(event.baseAmount).div(this.baseQuantumsPerCommon)
    if (amount.gt(acc)) return amount
    return acc
  }

  baseVolume (acc, event, idx) {
    if (!acc && idx === 0) acc = Big(0)
    return acc.plus(event.baseAmount).div(this.baseQuantumsPerCommon)
  }

  counterVolume (acc, event, idx) {
    if (!acc && idx === 0) acc = Big(0)
    return acc.plus(event.counterAmount).div(this.counterQuantumsPerCommon)
  }
}

module.exports = Reducers
