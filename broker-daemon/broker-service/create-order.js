const { status } = require('grpc')

/**
 * Creates an order with the relayer
 *
 * @param {GrpcUnaryMethod~request} request - request object
 * @param {Object} request.params - Request parameters from the client
 * @param {RelayerClient} request.relayer - grpc Client for interacting with the Relayer
 * @param {Object} responses
 * @param {function} responses.CreateOrderResponse - constructor for CreateOrderResponse messages
 * @return {responses.CreateOrderResponse}
 */
async function createOrder ({ params, relayer }, { CreateOrderResponse }) {
  const {
    // amount,
    // price,
    market,
    // timeinforce,
    side
  } = params

  // We need to calculate the base amount/counter amount based off of current
  // prices

  const [baseSymbol, counterSymbol] = market.split('/')

  const request = {
    ownerId: '123455678',
    payTo: 'ln:12234987',
    baseSymbol,
    counterSymbol,
    baseAmount: '10000',
    counterAmount: '1000000',
    side
  }

  const order = await relayer.createOrder(request)

  return new CreateOrderResponse({ orderId: order.orderId })
}

module.exports = createOrder
