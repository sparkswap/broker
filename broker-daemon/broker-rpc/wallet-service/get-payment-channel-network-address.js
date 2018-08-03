const { PublicError } = require('grpc-methods')

/**
 * Gets the payment channel network address from the specified engine
 *
 * @param {GrpcUnaryMethod~request} request - request object
 * @param {Logger} request.logger
 * @param {Object<String>} request.params
 * @param {Array<Engine>} request.engines
 * @param {Object} responses
 * @param {Function} responses.GetPaymentChannelNetworkAddressResponse constructor
 * @return {GetPaymentChannelNetworkAddressResponse}
 */
async function getPaymentChannelNetworkAddress ({ logger, params, engines }, { GetPaymentChannelNetworkAddressResponse }) {
  const { symbol } = params
  const engine = engines.get(symbol)

  if (!engine) {
    logger.error(`Could not find engine: ${symbol}`)
    throw new PublicError(`Unable to get network address for symbol: ${symbol}`)
  }

  const paymentChannelNetworkAddress = await engine.getPaymentChannelNetworkAddress()
  return new GetPaymentChannelNetworkAddressResponse({ paymentChannelNetworkAddress })
}

module.exports = getPaymentChannelNetworkAddress
