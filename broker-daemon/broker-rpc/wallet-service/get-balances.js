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
 * Grabs all balances from a specific engine (total and pending). If a particular
 * engine is unavailable an empty response will be returned
 *
 * @param {Array<symbol, engine>} SparkSwap Payment Channel Network Engine
 * @param {Logger} logger
 * @return {Object} res
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

  // We convert the engines map to an array and run balance engine commands
  // against each configuration.
  //
  // If an engine is unavailable or offline, we will still receive a response
  // however the values will be blank. This information will then need to be
  // handled by the consumer
  const enginePromises = Array.from(engines).map(async (engine) => {
    const [symbol, _] = engine // eslint-disable-line
    let res = { symbol }

    try {
      const balance = await getEngineBalances(engine, logger)
      res = Object.assign(res, balance)
    } catch (e) {
      logger.error(`Failed to get engine balances for ${symbol}`)
      res.error = e.toString()
    }

    return res
  })

  const balances = await Promise.all(enginePromises)

  logger.debug('Received engine balances', { balances })

  // We take the result from all engine balances and format/validate the information
  // to the `Balance` message in the broker.proto
  const engineBalances = balances.map((data) => {
    const {
      symbol,
      error = undefined,
      uncommittedBalance = undefined,
      uncommittedPendingBalance = undefined,
      totalChannelBalance = undefined,
      totalPendingChannelBalance = undefined
    } = data

    // If there is no symbol, then we will not be able to identify which currency
    // information this belongs to which could lead to providing the consumer with
    // incorrect data.
    if (!symbol) {
      throw new Error('Issue with balances payload. No symbol is available', { data })
    }

    // If data is not available AND there is no error, then we are in a weird state
    // and will not be able to provide the consumer of this service with correct
    // balance information.
    if (!error && !uncommittedBalance) {
      throw new Error('Unexpected response for balance', { data })
    }

    return {
      symbol,
      error,
      uncommittedBalance,
      totalChannelBalance,
      totalPendingChannelBalance,
      uncommittedPendingBalance
    }
  })

  logger.debug('Returning engine balances response', { engineBalances })

  return new GetBalancesResponse({ balances: engineBalances })
}

module.exports = getBalances
