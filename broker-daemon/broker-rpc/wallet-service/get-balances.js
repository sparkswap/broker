const {
  Big,
  GrpcResponse: GetBalancesResponse
} = require('../../utils')

/** @typedef {import('../broker-rpc-server').GrpcUnaryMethodRequest} GrpcUnaryMethodRequest */
/** @typedef {import('../broker-rpc-server').Engine} Engine */
/** @typedef {import('../broker-rpc-server').Logger} Logger */

/**
 * @constant
 * @type {object}
 * @default
 */
const BALANCE_PRECISION = 16

/** @typedef {object} GetEngineBalancesResponse
 *  @property {string} uncommittedBalance
 *  @property {string} uncommittedPendingBalance
 *  @property {string} totalChannelBalance
 *  @property {string} totalPendingChannelBalance
 *  @property {string} totalReservedChannelBalance
 */

/**
 * Grabs all balances from a specific engine (total and pending). If a particular
 * engine is unavailable an empty response will be returned
 *
 * @param {string} symbol
 * @param {Engine} engine - SparkSwap Payment Channel Network Engine
 * @param {Logger} logger
 * @returns {Promise<GetEngineBalancesResponse>}
 */
async function getEngineBalances (symbol, engine, logger) {
  const { quantumsPerCommon } = engine

  let [uncommittedBalance, totalChannelBalance, totalPendingChannelBalance, uncommittedPendingBalance, totalReservedChannelBalance] = await Promise.all([
    engine.getUncommittedBalance(),
    engine.getTotalChannelBalance(),
    engine.getTotalPendingChannelBalance(),
    engine.getUncommittedPendingBalance(),
    engine.getTotalReservedChannelBalance()
  ])

  logger.debug(`Received balances from ${symbol} engine`, { uncommittedBalance, totalChannelBalance, totalPendingChannelBalance, uncommittedPendingBalance, totalReservedChannelBalance })

  totalChannelBalance = Big(totalChannelBalance).div(quantumsPerCommon).toFixed(BALANCE_PRECISION)
  totalPendingChannelBalance = Big(totalPendingChannelBalance).div(quantumsPerCommon).toFixed(BALANCE_PRECISION)
  uncommittedBalance = Big(uncommittedBalance).div(quantumsPerCommon).toFixed(BALANCE_PRECISION)
  uncommittedPendingBalance = Big(uncommittedPendingBalance).div(quantumsPerCommon).toFixed(BALANCE_PRECISION)
  totalReservedChannelBalance = Big(totalReservedChannelBalance).div(quantumsPerCommon).toFixed(BALANCE_PRECISION)

  return {
    uncommittedBalance,
    totalChannelBalance,
    totalPendingChannelBalance,
    uncommittedPendingBalance,
    totalReservedChannelBalance
  }
}

/**
 * Grabs the daemons lnd wallet balance
 *
 * @function
 * @param {GrpcUnaryMethodRequest} request - request object
 * @returns {Promise<GetBalancesResponse>}
 */
async function getBalances ({ logger, engines }) {
  logger.info(`Checking wallet balances for ${engines.size} engines`)

  // We convert the engines map to an array and run balance engine commands
  // against each configuration.
  //
  // If an engine is unavailable or offline, we will still receive a response
  // however the values will be blank. This information will then need to be
  // handled by the consumer
  const enginePromises = Array.from(engines).map(async ([symbol, engine]) => {
    try {
      const balances = await getEngineBalances(symbol, engine, logger)

      return {
        symbol,
        ...balances
      }
    } catch (e) {
      logger.error(`Failed to get engine balances for ${symbol}`, { error: e.toString() })

      return {
        symbol,
        error: e.toString()
      }
    }
  })

  const engineBalances = await Promise.all(enginePromises)

  logger.debug('Returning engine balances response', { engineBalances })

  return new GetBalancesResponse({ balances: engineBalances })
}

module.exports = getBalances
