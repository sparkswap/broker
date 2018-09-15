const { PublicError } = require('grpc-methods')
const { currencies } = require('../../config')
const { Big } = require('../../utils')
/**
 * Withdraws funds from the wallet to specified address
 *
 * @param {Object} request - request object
 * @param {Object} request.params
 * @param {String} request.params.symbol
 * @param {String} request.params.address
 * @param {RelayerClient} request.relayer
 * @param {Logger} request.logger
 * @param {Map<Engine>} request.engines
 * @param {function} responses.WithdrawFundsResponse
 * @return {WithdrawFundsResponse}
 */
async function withdrawFunds ({ params, relayer, logger, engines }, { WithdrawFundsResponse }) {
  const { symbol, amount, address } = params

  const engine = engines.get(symbol)
  if (!engine) {
    throw new PublicError(`No engine available for ${symbol}`)
  }

  const multiplier = currencies.find(({ symbol: configSymbol }) => configSymbol === symbol).quantumsPerCommon
  const amountInSat = (Big(amount) * multiplier)

  try {
    logger.info(`Attempting to withdraw ${amount} ${symbol} from wallet to ${address}`)
    const txid = await engine.withdrawFunds(address, amountInSat)
    logger.info(`Successfully withdrew ${amount} ${symbol} from wallet to ${address}, transaction id: ${txid}`)
    return new WithdrawFundsResponse({txid})
  } catch (err) {
    throw new PublicError(err.message, err)
  }
}

module.exports = withdrawFunds
