const { PublicError } = require('grpc-methods')

/**
 * Withdraws funds from the wallet to specified address
 *
 * @param {Object} request - request object
 * @param {Object} request.params
 * @param {RelayerClient} request.relayer
 * @param {Logger} request.logger
 * @param {Engine} request.engines
 * @param {function} responses.WithdrawFundsResponse
 * @return {WithdrawFundsResponse}
 */
async function withdrawFunds ({ params, relayer, logger, engines }, { WithdrawFundsResponse }) {
  const { symbol, amount, address } = params

  const amountInSat = (parseInt(amount) * 100000000)

  const engine = engines.get(symbol)
  if (!engine) {
    throw new PublicError(`No engine available for ${symbol}`)
  }

  try {
    logger.info(`Attempting to withdraw ${amount} ${symbol} from wallet to ${address}`)
    const { txid } = await engine.withdrawFunds(address, amountInSat)
    logger.info(`Successfully withdrew ${amount} ${symbol} from wallet to ${address}, transaction id: ${txid}`)
    return new WithdrawFundsResponse({id: txid})
  } catch (err) {
    throw new PublicError(err.message, err)
  }
}

module.exports = withdrawFunds
