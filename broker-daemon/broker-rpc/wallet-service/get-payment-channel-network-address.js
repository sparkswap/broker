/**
 * Gets the payment channel network address from the specified engine
 *
 * @param {GrpcUnaryMethod~request} request - request object
 * @param {Logger} request.logger
 * @param {object<string>} request.params
 * @param {Array<Engine>} request.engines
 * @param {object} responses
 * @param {Function} responses.GetPaymentChannelNetworkAddressResponse - constructor
 * @returns {GetPaymentChannelNetworkAddressResponse}
 */
async function getPaymentChannelNetworkAddress ({ logger, params, engines }, { GetPaymentChannelNetworkAddressResponse }) {
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
