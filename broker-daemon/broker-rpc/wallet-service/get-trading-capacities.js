const { currencies } = require('../../config')
const { Big } = require('../../utils')

const SIDES = Object.freeze({
  BID: 'BID',
  ASK: 'ASK'
})
/**
 * Grabs the total balance and total channel balance from a specified engine
 *
 * @param {Engine} SparkSwap Payment Channel Network Engine
 * @param {String} symbol
 * @param {String} amount of outstanding send capacity for the given currency
 * @param {String} amount of outstanding receive capacity for the given currency
 * @return {Object} including symbol and available, pending, outstanding, and inactive capacties for sending and receiving
 */
async function getCapacities (engine, symbol, outstandingSendCapacity, outstandingReceiveCapacity) {
  const { quantumsPerCommon: divideBy } = currencies.find(({ symbol: configSymbol }) => configSymbol === symbol) || {}
  if (!divideBy) throw new Error(`Currency was not found when trying to get trading capacities: ${this.symbol}`)

  const [
    openChannelCapacities,
    pendingChannelCapacities
  ] = await Promise.all([
    engine.getOpenChannelCapacities(),
    engine.getPendingChannelCapacities()
  ])

  const activeChannelCapacities = openChannelCapacities.active
  const inactiveChannelCapacities = openChannelCapacities.inactive

  return {
    symbol,
    availableReceiveCapacity: Big(activeChannelCapacities.remoteBalance).minus(outstandingReceiveCapacity).div(divideBy).toString(),
    availableSendCapacity: Big(activeChannelCapacities.localBalance).minus(outstandingSendCapacity).div(divideBy).toString(),
    pendingSendCapacity: Big(pendingChannelCapacities.localBalance).div(divideBy).toString(),
    pendingReceiveCapacity: Big(pendingChannelCapacities.remoteBalance).div(divideBy).toString(),
    inactiveSendCapacity: Big(inactiveChannelCapacities.localBalance).div(divideBy).toString(),
    inactiveReceiveCapacity: Big(inactiveChannelCapacities.remoteBalance).div(divideBy).toString(),
    outstandingReceiveCapacity: Big(outstandingReceiveCapacity).div(divideBy).toString(),
    outstandingSendCapacity: Big(outstandingSendCapacity).div(divideBy).toString()
  }
}

/**
 * Grabs the remote and local capacities from the requested engines and orders/fills store available, pending, outstanding, and inactive channels
 *
 * @function
 * @param {GrpcUnaryMethod~request} request - request object
 * @param {Object} request.params
 * @param {Map} request.engines
 * @param {Logger} request.logger
 * @param {Object} request.orderbooks - initialized orderbooks
 * @param {function} responses.GetTradingCapacitiesResponse
 * @return {GetTradingCapacitiesResponse}
 */
async function getTradingCapacities ({ params, logger, engines, orderbooks, blockOrderWorker }, { GetTradingCapacitiesResponse }) {
  const { market } = params
  const orderbook = orderbooks.get(market)

  if (!orderbook) {
    throw new Error(`${market} is not being tracked as a market.`)
  }
  const [ baseSymbol, counterSymbol ] = market.split('/')

  const baseEngine = engines.get(baseSymbol)
  if (!baseEngine) {
    throw new Error(`No engine available for ${baseSymbol}`)
  }

  const counterEngine = engines.get(counterSymbol)
  if (!counterEngine) {
    throw new Error(`No engine available for ${counterSymbol}`)
  }

  const [
    { activeOutboundAmount: committedCounterSendCapacity, activeInboundAmount: committedBaseReceiveCapacity },
    { activeOutboundAmount: committedBaseSendCapacity, activeInboundAmount: committedCounterReceiveCapacity }
  ] = await Promise.all([
    blockOrderWorker.calculateActiveFunds(market, SIDES.BID),
    blockOrderWorker.calculateActiveFunds(market, SIDES.ASK)
  ])

  const [baseSymbolCapacities, counterSymbolCapacities] = await Promise.all([
    getCapacities(baseEngine, baseSymbol, committedBaseSendCapacity, committedBaseReceiveCapacity),
    getCapacities(counterEngine, counterSymbol, committedCounterSendCapacity, committedCounterReceiveCapacity)
  ])

  return new GetTradingCapacitiesResponse({ baseSymbolCapacities, counterSymbolCapacities })
}

module.exports = getTradingCapacities
