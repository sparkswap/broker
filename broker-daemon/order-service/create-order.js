const { PublicError } = require('grpc-methods')
const bigInt = require('big-integer')
const Order = require('../order-worker/order')

/**
 * Creates an order with the relayer
 *
 * @param {GrpcUnaryMethod~request} request - request object
 * @param {Object} request.params - Request parameters from the client
 * @param {RelayerClient} request.relayer - grpc Client for interacting with the Relayer
 * @param {Object} request.logger
 * @param {Object} request.orderStore
 * @param {Object} responses
 * @param {function} responses.CreateOrderResponse - constructor for CreateOrderResponse messages
 * @return {responses.CreateOrderResponse}
 */
async function createOrder ({ params, logger, orderWorker }, { CreateOrderResponse, TimeInForce }) {
  const {
    amount,
    price,
    market,
    side,
    timeInForce
  } = params

  // Price is optional. If no price is provided, we treat it as a Market Order.
  if (!price) {
    throw new PublicError(`Market orders are not currently supported`)
  }

  // default time in force is GTC
  if (timeInForce && TimeInForce[timeInForce] !== TimeInForce.GTC) {
    throw new PublicError('Only Good-til-cancelled orders are currently supported')
  }

  const orderId = await orderWorker.createOrder({
    marketName: market,
    side: side,
    amount,
    price,
    timeInForce: 'GTC'
  })

  return new CreateOrderResponse({ orderId: orderId })
}

module.exports = createOrder
