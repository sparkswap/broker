const { currencies } = require('../../config')
const { Big } = require('../../utils')
/**
 * Grabs the total balance and total channel balance from a specified engine
 *
 * @param {Array<symbol, engine>} SparkSwap Payment Channel Network Engine
 * @return {Object} including symbol and capactiies for sending and receiving in active, pending, and inactive channels
 */
async function getEngineTradingCapacities ([symbol, engine]) {
  const [openChannelCapacities, pendingChannelCapacities] = await Promise.all([
    engine.getOpenChannelCapacities(),
    engine.getPendingChannelCapacities()
  ])

  const activeChannelCapacities = openChannelCapacities.active
  const inactiveChannelCapacities = openChannelCapacities.inactive
  const divideBy = currencies.find(({ symbol: configSymbol }) => configSymbol === symbol).quantumsPerCommon
  return {
    symbol,
    activeSendCapacity: Big(activeChannelCapacities.localBalance).div(divideBy).toString(),
    activeReceiveCapacity: Big(activeChannelCapacities.remoteBalance).div(divideBy).toString(),
    pendingSendCapacity: Big(pendingChannelCapacities.localBalance).div(divideBy).toString(),
    pendingReceiveCapacity: Big(pendingChannelCapacities.remoteBalance).div(divideBy).toString(),
    inactiveSendCapacity: Big(inactiveChannelCapacities.localBalance).div(divideBy).toString(),
    inactiveReceiveCapacity: Big(inactiveChannelCapacities.remoteBalance).div(divideBy).toString()
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
async function getTradingCapacities ({ params, logger, engines, orderbooks }, { GetTradingCapacitiesResponse }) {
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
    getEngineTradingCapacities([baseSymbol, baseEngine]),
    getEngineTradingCapacities([counterSymbol, counterEngine])
  ])

  return new GetTradingCapacitiesResponse({ baseSymbolCapacities, counterSymbolCapacities })
}

module.exports = getTradingCapacities
