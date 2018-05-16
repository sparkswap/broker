const { PublicError } = require('grpc-methods')

/**
 * Creates a local order and interacts with the relayer to enact it
 *
 * @param {GrpcUnaryMethod~request} request - request object
 * @param {Object} request.params - Request parameters from the client
 * @param {RelayerClient} request.relayer - grpc Client for interacting with the Relayer
 * @param {Object} responses
 * @param {function} responses.CreateOrderResponse - constructor for CreateOrderResponse messages
 * @return {responses.CreateOrderResponse}
 */
async function createOrder ({ params, relayer }, { CreateOrderResponse, Side, TimeInForce }) {
  const {
    // amount,
    // price,
    market,
    timeinforce,
    side
  } = params

  if (!Object.keys(TimeInForce).includes(timeinforce)) {
    throw new PublicError(`${timeinforce} is an invalid parameter for timeinforce`)
  }

  if (!Object.keys(Side).includes(side)) {
    throw new PublicError(`${side} is an invalid parameter for side`)
  }

  if (timeinforce !== TimeInForce.GTC) {
    throw new PublicError(`Only GTC orders are currently supported`)
  }

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
