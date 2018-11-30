const { currencies } = require('../../config')
const { Big } = require('../../utils')
/**
 * Grabs the total balance and total channel balance from a specified engine
 *
 * @param {Array<symbol, engine>} SparkSwap Payment Channel Network Engine
 * @return {Object} including symbol and capactiies for sending and receiving in active, pending, and inactive channels
 */
async function getEngineTradingCapacities (engine) {
  const [openChannelCapacities, pendingChannelCapacities] = await Promise.all([
    engine.getOpenChannelCapacities(),
    engine.getPendingChannelCapacities()
  ])

  const activeChannelCapacities = openChannelCapacities.active
  const inactiveChannelCapacities = openChannelCapacities.inactive
  return {
    activeSendCapacity: Big(activeChannelCapacities.localBalance),
    activeReceiveCapacity: Big(activeChannelCapacities.remoteBalance),
    pendingSendCapacity: Big(pendingChannelCapacities.localBalance),
    pendingReceiveCapacity: Big(pendingChannelCapacities.remoteBalance),
    inactiveSendCapacity: Big(inactiveChannelCapacities.localBalance),
    inactiveReceiveCapacity: Big(inactiveChannelCapacities.remoteBalance)
  }
}

/**
 * Grabs the remote and local capacities from the requested engines active, pending and inactive channels
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

  const [baseSymbolCapacities, counterSymbolCapacities] = await Promise.all([
    getEngineTradingCapacities(baseEngine),
    getEngineTradingCapacities(counterEngine)
  ])

  const { activeOutboundAmount: committedCounterSendCapacity, activeInboundAmount: committedBaseReceiveCapacity } = await blockOrderWorker.calculateActiveFunds(market, 'BID')
  const { activeOutboundAmount: committedBaseSendCapacity, activeInboundAmount: committedCounterReceiveCapacity } = await blockOrderWorker.calculateActiveFunds(market, 'ASK')

  baseSymbolCapacities.availableReceiveCapacity = Big(baseSymbolCapacities.activeReceiveCapacity).minus(committedBaseReceiveCapacity)
  baseSymbolCapacities.availableSendCapacity = Big(baseSymbolCapacities.activeSendCapacity).minus(committedBaseSendCapacity)
  counterSymbolCapacities.availableSendCapacity = Big(counterSymbolCapacities.activeSendCapacity).minus(committedCounterSendCapacity)
  counterSymbolCapacities.availableReceiveCapacity = Big(counterSymbolCapacities.activeReceiveCapacity).minus(committedCounterReceiveCapacity)

  baseSymbolCapacities.outstandingReceiveCapacity = Big(committedBaseReceiveCapacity)
  baseSymbolCapacities.outstandingSendCapacity = Big(committedBaseSendCapacity)
  counterSymbolCapacities.outstandingSendCapacity = Big(committedCounterSendCapacity)
  counterSymbolCapacities.outstandingReceiveCapacity = Big(committedCounterReceiveCapacity)

  const baseDivideBy = currencies.find(({ symbol: configSymbol }) => configSymbol === baseSymbol).quantumsPerCommon
  const counterDivideBy = currencies.find(({ symbol: configSymbol }) => configSymbol === counterSymbol).quantumsPerCommon

  for (let [key, value] of Object.entries(baseSymbolCapacities)) {
    baseSymbolCapacities[key] = Big(value).div(baseDivideBy).toString()
  }

  for (let [key, value] of Object.entries(counterSymbolCapacities)) {
    counterSymbolCapacities[key] = Big(value).div(counterDivideBy).toString()
  }

  baseSymbolCapacities.symbol = baseSymbol
  counterSymbolCapacities.symbol = counterSymbol

  return new GetTradingCapacitiesResponse({ baseSymbolCapacities, counterSymbolCapacities })
}

module.exports = getTradingCapacities
