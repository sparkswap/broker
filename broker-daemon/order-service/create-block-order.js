const { PublicError } = require('grpc-methods')
const bigInt = require('big-integer')

/**
 * Creates an order with the relayer
 *
 * @param {GrpcUnaryMethod~request} request - request object
 * @param {Object} request.params - Request parameters from the client
 * @param {RelayerClient} request.relayer - grpc Client for interacting with the Relayer
 * @param {Object} logger
 * @param {Object} responses
 * @param {function} responses.CreateBlockOrderResponse - constructor for CreateBlockOrderResponse messages
 * @return {responses.CreateBlockOrderResponse}
 */
async function createBlockOrder ({ params, relayer, logger, orderbooks }, { CreateBlockOrderResponse, TimeInForce }) {
  const {
    amount,
    price,
    market,
    side,
    timeInForce
  } = params

  const orderbook = orderbooks.get(market)

  if (!orderbook) {
    throw new PublicError(`${market} is not being tracked as a market. Configure kbd to track ${market} using the MARKETS environment variable.`)
  }

  // Price is optional. If no price is provided, we treat it as a Market Order.
  if (!price) {
    throw new PublicError(`Market orders are not currently supported`)
  }

  // default time in force is GTC
  if (timeInForce && TimeInForce[timeInForce] !== TimeInForce.GTC) {
    throw new PublicError('Only Good-til-cancelled orders are currently supported')
  }

  logger.info(`Creating a sample order directly on the relayer. This is NOT production behavior.`)

  // We need to calculate the base amount/counter amount based off of current
  // prices
  const counterAmount = bigInt(amount).multiply(bigInt(price))

  const { baseSymbol, counterSymbol } = orderbook

  const request = {
    ownerId: '123455678',
    payTo: 'ln:12234987',
    baseSymbol,
    counterSymbol,
    baseAmount: amount,
    counterAmount: counterAmount.toString(),
    side
  }

  const order = await relayer.createBlockOrder(request)

  return new CreateBlockOrderResponse({ orderId: order.orderId })
}

module.exports = createBlockOrder
