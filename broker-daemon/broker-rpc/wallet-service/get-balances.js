const { Big } = require('../../utils')

/**
 * @constant
 * @type {Object}
 * @default
 */
const BALANCE_PRECISION = 16

/**
 * Grabs all balances from a specific engine (total and pending). If a particular
 * engine is unavailable an empty response will be returned
 *
 * @param {string} symbol
 * @param {Engine} engine - SparkSwap Payment Channel Network Engine
 * @param {Logger} logger
 * @returns {Object} res
 * @returns {string} res.uncommittedBalance
 * @returns {string} res.uncommittedPendingBalance
 * @returns {string} res.totalChannelBalance
 * @returns {string} res.totalPendingChannelBalance
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
 * @param {GrpcUnaryMethod~request} request - request object
 * @param {Map} request.engines
 * @param {Logger} request.logger
 * @param {Object} responses
 * @param {Function} responses.GetBalanceResponse
 * @returns {GetBalanceResponse}
 */
async function getBalances ({ logger, engines }, { GetBalancesResponse }) {
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
