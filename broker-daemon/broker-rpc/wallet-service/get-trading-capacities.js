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

async function getAvailableAndOutstandingCapacities (blockOrderWorker, market, baseSymbolCapacities, counterSymbolCapacities) {
  const { activeOutboundAmount: committedCounterSendCapacity, activeInboundAmount: committedBaseReceiveCapacity } = await blockOrderWorker.calculateActiveFunds(market, 'BID')
  const { activeOutboundAmount: committedBaseSendCapacity, activeInboundAmount: committedCounterReceiveCapacity } = await blockOrderWorker.calculateActiveFunds(market, 'ASK')

  return {
    baseAvailableReceiveCapacity: Big(baseSymbolCapacities.activeReceiveCapacity).minus(committedBaseReceiveCapacity),
    baseAvailableSendCapacity: Big(baseSymbolCapacities.activeSendCapacity).minus(committedBaseSendCapacity),
    counterAvailableSendCapacity: Big(counterSymbolCapacities.activeSendCapacity).minus(committedCounterSendCapacity),
    counterAvailableReceiveCapacity: Big(counterSymbolCapacities.activeReceiveCapacity).minus(committedCounterReceiveCapacity),
    baseOutstandingReceiveCapacity: Big(committedBaseReceiveCapacity),
    baseOutstandingSendCapacity: Big(committedBaseSendCapacity),
    counterOutstandingSendCapacity: Big(committedCounterSendCapacity),
    counterOutstandingReceiveCapacity: Big(committedCounterReceiveCapacity)
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

  const availableOutstandingCapacities = await getAvailableAndOutstandingCapacities(blockOrderWorker, market, baseSymbolCapacities, counterSymbolCapacities)
  const baseDivideBy = currencies.find(({ symbol: configSymbol }) => configSymbol === baseSymbol).quantumsPerCommon
  const counterDivideBy = currencies.find(({ symbol: configSymbol }) => configSymbol === counterSymbol).quantumsPerCommon

  return new GetTradingCapacitiesResponse({
    baseSymbolCapacities: {
      symbol: baseSymbol,
      pendingSendCapacity: Big(baseSymbolCapacities.pendingSendCapacity).div(baseDivideBy).toString(),
      pendingReceiveCapacity: Big(baseSymbolCapacities.pendingReceiveCapacity).div(baseDivideBy).toString(),
      inactiveSendCapacity: Big(baseSymbolCapacities.inactiveSendCapacity).div(baseDivideBy).toString(),
      inactiveReceiveCapacity: Big(baseSymbolCapacities.inactiveReceiveCapacity).div(baseDivideBy).toString(),
      availableSendCapacity: Big(availableOutstandingCapacities.baseAvailableSendCapacity).div(baseDivideBy).toString(),
      availableReceiveCapacity: Big(availableOutstandingCapacities.baseAvailableReceiveCapacity).div(baseDivideBy).toString(),
      outstandingSendCapacity: Big(availableOutstandingCapacities.baseOutstandingSendCapacity).div(baseDivideBy).toString(),
      outstandingReceiveCapacity: Big(availableOutstandingCapacities.baseOutstandingReceiveCapacity).div(baseDivideBy).toString()
    },
    counterSymbolCapacities: {
      symbol: counterSymbol,
      pendingSendCapacity: Big(counterSymbolCapacities.pendingSendCapacity).div(counterDivideBy).toString(),
      pendingReceiveCapacity: Big(counterSymbolCapacities.pendingReceiveCapacity).div(counterDivideBy).toString(),
      inactiveSendCapacity: Big(counterSymbolCapacities.inactiveSendCapacity).div(counterDivideBy).toString(),
      inactiveReceiveCapacity: Big(counterSymbolCapacities.inactiveReceiveCapacity).div(counterDivideBy).toString(),
      availableSendCapacity: Big(availableOutstandingCapacities.counterAvailableSendCapacity).div(counterDivideBy).toString(),
      availableReceiveCapacity: Big(availableOutstandingCapacities.counterAvailableReceiveCapacity).div(counterDivideBy).toString(),
      outstandingSendCapacity: Big(availableOutstandingCapacities.counterOutstandingSendCapacity).div(counterDivideBy).toString(),
      outstandingReceiveCapacity: Big(availableOutstandingCapacities.counterOutstandingReceiveCapacity).div(counterDivideBy).toString()
    }
  })
}

module.exports = getTradingCapacities
