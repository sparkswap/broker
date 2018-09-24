const { PublicError } = require('grpc-methods')

const { currencies: currencyConfig } = require('../../config')
const { Big } = require('../../utils')

/**
 * @constant
 * @type {object}
 * @default
 */
const BALANCE_PRECISION = 16

/**
 * Grabs the total balance and total channel balance from a specified engine
 *
 * @param {Array<symbol, engine>} SparkSwap Payment Channel Network Engine
 * @param {Logger} logger
 * @return {Array} res
 * @return {String} res.symbol
 * @return {String} res.uncommittedBalance
 * @return {String} res.uncommittedPendingBalance
 * @return {String} res.totalChannelBalance
 * @return {String} res.totalPendingChannelBalance
 */
async function getEngineBalances ([symbol, engine], logger) {
  const { quantumsPerCommon } = currencyConfig.find(({ symbol: configSymbol }) => configSymbol === symbol) || {}

  if (!quantumsPerCommon) {
    logger.error(`Currency not supported in ${symbol} configuration`)
    throw new PublicError(`Currency not supported in ${symbol} configuration`)
  }

  let [uncommittedBalance, totalChannelBalance, totalPendingChannelBalance, uncommittedPendingBalance] = await Promise.all([
    engine.getUncommittedBalance(),
    engine.getTotalChannelBalance(),
    engine.getTotalPendingChannelBalance(),
    engine.getUncommittedPendingBalance()
  ])

  logger.debug(`Received balances from ${symbol} engine`, { uncommittedBalance, totalChannelBalance, totalPendingChannelBalance, uncommittedPendingBalance })

  totalChannelBalance = Big(totalChannelBalance).div(quantumsPerCommon).toFixed(BALANCE_PRECISION)
  totalPendingChannelBalance = Big(totalPendingChannelBalance).div(quantumsPerCommon).toFixed(BALANCE_PRECISION)
  uncommittedBalance = Big(uncommittedBalance).div(quantumsPerCommon).toFixed(BALANCE_PRECISION)
  uncommittedPendingBalance = Big(uncommittedPendingBalance).div(quantumsPerCommon).toFixed(BALANCE_PRECISION)

  return {
    symbol,
    uncommittedBalance,
    totalChannelBalance,
    totalPendingChannelBalance,
    uncommittedPendingBalance
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
 * @param {function} responses.GetBalanceResponse
 * @return {GetBalanceResponse}
 */
async function getBalances ({ logger, engines }, { GetBalancesResponse }) {
  logger.info(`Checking wallet balances for ${engines.size} engines`)

  // We convert the engines map to an array and run totalBalance commands
  // against each configuration
  const engineBalances = await Promise.all(Array.from(engines).map((engine) => {
    return getEngineBalances(engine, logger)
  }))

  logger.debug('Received engine balances', { engineBalances })

  return new GetBalancesResponse({ balances: engineBalances })
}

module.exports = getBalances
