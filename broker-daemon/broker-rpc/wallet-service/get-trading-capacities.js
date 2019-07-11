const { currencies } = require('../../config')
const { Big } = require('../../utils')

/**
 * @constant
 * @type {object}
 * @default
 */
const CAPACITY_STATE = Object.freeze({
  OK: 'OK',
  FAILED: 'FAILED'
})

/** @typedef {object} GetCapacitiesResponse
 * @property {string} symbol - currency symbol e.g. BTC
 * @property {string} status - OK for success or FAILED if engine call fails
 * @property {boolean} error - true if errors occurred during request for capacities
 * @property {string} availableReceiveCapacity
 * @property {string} availableSendCapacity
 * @property {string} pendingSendCapacity
 * @property {string} pendingReceiveCapacity
 * @property {string} inactiveSendCapacity
 * @property {string} inactiveReceiveCapacity
 * @property {string} outstandingReceiveCapacity
 * @property {string} outstandingSendCapacity
 */

/**
 * Grabs the total balance and total channel balance from a specified engine
 *
 * @param {Engine} engine - Sparkswap Payment Channel Network Engine
 * @param {string} symbol
 * @param {string} outstandingSendCapacity - amount of outstanding send capacity for the given currency
 * @param {string} outstandingReceiveCapacity - amount of outstanding receive capacity for the given currency
 * @param {object} opts
 * @param {Logger} opts.logger
 * @returns {Promise<GetCapacitiesResponse>}
 */
async function getCapacities (engine, symbol, outstandingSendCapacity, outstandingReceiveCapacity, { logger }) {
  const { quantumsPerCommon } = currencies.find(({ symbol: configSymbol }) => configSymbol === symbol) || {}

  if (!quantumsPerCommon) {
    throw new Error(`Currency was not found when trying to get trading capacities: ${this.symbol}`)
  }

  try {
    const [
      openChannelCapacities,
      pendingChannelCapacities
    ] = await Promise.all([
      engine.getOpenChannelCapacities(),
      engine.getPendingChannelCapacities()
    ])

    const {
      active: activeChannelCapacities,
      inactive: inactiveChannelCapacities
    } = openChannelCapacities

    return {
      symbol,
      status: CAPACITY_STATE.OK,
      availableReceiveCapacity: Big(activeChannelCapacities.remoteBalance).minus(outstandingReceiveCapacity).div(quantumsPerCommon).toString(),
      availableSendCapacity: Big(activeChannelCapacities.localBalance).minus(outstandingSendCapacity).div(quantumsPerCommon).toString(),
      pendingSendCapacity: Big(pendingChannelCapacities.localBalance).div(quantumsPerCommon).toString(),
      pendingReceiveCapacity: Big(pendingChannelCapacities.remoteBalance).div(quantumsPerCommon).toString(),
      inactiveSendCapacity: Big(inactiveChannelCapacities.localBalance).div(quantumsPerCommon).toString(),
      inactiveReceiveCapacity: Big(inactiveChannelCapacities.remoteBalance).div(quantumsPerCommon).toString(),
      outstandingReceiveCapacity: Big(outstandingReceiveCapacity).div(quantumsPerCommon).toString(),
      outstandingSendCapacity: Big(outstandingSendCapacity).div(quantumsPerCommon).toString()
    }
  } catch (e) {
    logger.debug(`Received error when trying to get engine capacities for ${symbol}`, { outstandingReceiveCapacity, outstandingSendCapacity })

    return {
      symbol,
      status: CAPACITY_STATE.FAILED,
      error: e.message
    }
  }
}

/**
 * Grabs the remote and local capacities from the requested engines and orders/fills store available, pending, outstanding, and inactive channels
 *
 * @function
 * @param {GrpcUnaryMethod~request} request - request object
 * @param {object} request.params
 * @param {Map<symbol, Engine>} request.engines
 * @param {object} request.orderbooks - initialized orderbooks
 * @param {BlockOrderWorker} request.blockOrderWorker
 * @param {Logger} request.logger
 * @param {object} responses
 * @param {Function} responses.GetTradingCapacitiesResponse
 * @returns {Promise<GetTradingCapacitiesResponse>}
 */
async function getTradingCapacities ({ params, engines, orderbooks, blockOrderWorker, logger }, { GetTradingCapacitiesResponse }) {
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

  logger.debug(`Calculating active funds for ${market}`)

  const [
    { outbound: committedCounterSendCapacity, inbound: committedBaseReceiveCapacity },
    { outbound: committedBaseSendCapacity, inbound: committedCounterReceiveCapacity }
  ] = await Promise.all([
    blockOrderWorker.calculateActiveFunds(market, { outboundSymbol: counterSymbol, inboundSymbol: baseSymbol }),
    blockOrderWorker.calculateActiveFunds(market, { outboundSymbol: baseSymbol, inboundSymbol: counterSymbol })
  ])

  // Capacities will always be returned for each side of the market, however if
  // the engine is unavailable, we will receive blank capacities w/ an `error` property
  // in the payload of the returned data
  const [
    baseSymbolCapacities,
    counterSymbolCapacities
  ] = await Promise.all([
    getCapacities(baseEngine, baseSymbol, committedBaseSendCapacity, committedBaseReceiveCapacity, { logger }),
    getCapacities(counterEngine, counterSymbol, committedCounterSendCapacity, committedCounterReceiveCapacity, { logger })
  ])

  logger.debug(`Received capacities for market ${market}`, { baseSymbolCapacities, counterSymbolCapacities })

  return new GetTradingCapacitiesResponse({ baseSymbolCapacities, counterSymbolCapacities })
}

module.exports = getTradingCapacities
