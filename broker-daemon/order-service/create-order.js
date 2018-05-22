const { PublicError } = require('grpc-methods')
const bigInt = require('big-integer')
const safeid = require('generate-safe-id')
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
async function createOrder ({ params, relayer, logger, orderbooks, orderStore }, { CreateOrderResponse, TimeInForce }) {
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

  const order = new Order({ id: safeid(), marketName: orderbook.marketName, side, amount, price, timeInForce })

  await store.put(order.key, order.value)

  return new CreateOrderResponse({ orderId: order.id })
}

module.exports = createOrder
