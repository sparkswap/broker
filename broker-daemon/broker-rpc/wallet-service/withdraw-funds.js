const { currencies } = require('../../config')
const { Big } = require('../../utils')

/**
 * Withdraws funds from the wallet to specified address
 *
 * @param {Object} request - request object
 * @param {Object} request.params
 * @param {string} request.params.symbol
 * @param {string} request.params.amount
 * @param {string} request.params.address
 * @param {RelayerClient} request.relayer
 * @param {Logger} request.logger
 * @param {Map<Symbol, Engine>} request.engines
 * @param {Object} responses
 * @param {Function} responses.WithdrawFundsResponse
 * @returns {WithdrawFundsResponse}
 */
async function withdrawFunds ({ params, relayer, logger, engines }, { WithdrawFundsResponse }) {
  const { symbol, amount, address } = params

  const engine = engines.get(symbol)
  if (!engine) {
    throw new Error(`No engine available for ${symbol}`)
  }

  const { quantumsPerCommon: multiplier } = currencies.find(({ symbol: configSymbol }) => configSymbol === symbol) || {}
  if (!multiplier) {
    throw new Error(`Invalid configuration: missing quantumsPerCommon for ${symbol}`)
  }
  const amountInSat = Big(amount).times(multiplier)

  logger.info(`Attempting to withdraw ${amount} ${symbol} from wallet to ${address}`)
  const txid = await engine.withdrawFunds(address, amountInSat.toString())
  logger.info(`Successfully withdrew ${amount} ${symbol} from wallet to ${address}, transaction id: ${txid}`)

  return new WithdrawFundsResponse({ txid })
}

module.exports = withdrawFunds
