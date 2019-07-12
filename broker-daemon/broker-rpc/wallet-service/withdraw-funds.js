const {
  Big,
  GrpcResponse: WithdrawFundsResponse
} = require('../../utils')

/** @typedef {import('../broker-rpc-server').GrpcUnaryMethodRequest} GrpcUnaryMethodRequest */

/**
 * Withdraws funds from the wallet to specified address
 *
 * @param {GrpcUnaryMethodRequest} request - request object
 * @returns {Promise<WithdrawFundsResponse>}
 */
async function withdrawFunds ({ params, logger, engines }) {
  const { symbol, amount, address } = params

  const engine = engines.get(symbol)
  if (!engine) {
    throw new Error(`No engine available for ${symbol}`)
  }

  const multiplier = engine.quantumsPerCommon
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
