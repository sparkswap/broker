const { GrpcResponse: GetPaymentChannelNetworkAddressResponse } = require('../../utils')

/** @typedef {import('../broker-rpc-server').GrpcUnaryMethodRequest} GrpcUnaryMethodRequest */

/**
 * Gets the payment channel network address from the specified engine
 *
 * @param {GrpcUnaryMethodRequest} request - request object
 * @returns {Promise<GetPaymentChannelNetworkAddressResponse>}
 */
async function getPaymentChannelNetworkAddress ({ logger, params, engines }) {
  const { symbol } = params
  const engine = engines.get(symbol)

  if (!engine) {
    logger.error(`Could not find engine: ${symbol}`)
    throw new Error(`Unable to get network address for symbol: ${symbol}`)
  }

  const paymentChannelNetworkAddress = await engine.getPaymentChannelNetworkAddress()
  return new GetPaymentChannelNetworkAddressResponse({ paymentChannelNetworkAddress })
}

module.exports = getPaymentChannelNetworkAddress
