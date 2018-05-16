const { PublicError } = require('grpc-methods')
const { createMarketOrder, createGoodTilCancelledOrder } = require('../orders')

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
async function createOrder ({ params, relayer, orderbooks }, { CreateOrderResponse, Side, TimeInForce }) {
  const {
    amount,
    price,
    market,
    side
  } = params

  // default time in force is GTC
  const timeinforce = params.timeinforce || TimeInForce.GTC

  if (!Object.keys(TimeInForce).includes(timeinforce)) {
    throw new PublicError(`${timeinforce} is an invalid parameter for timeinforce`)
  }

  if (!Object.keys(Side).includes(side)) {
    throw new PublicError(`${side} is an invalid parameter for side`)
  }

  if (!orderbooks[market]) {
    throw new PublicError(`${market} is not being tracked as a market. Configure kbd to track ${market} using the MARKETS environment variable.`)
  }

  if (!price) {
    return createMarketOrder(orderbooks[market], { side, amount })
  }

  if (timeinforce === TimeInForce.GTC) {
    return createGoodTilCancelledOrder(orderbooks[market], { side, amount, price })
  } else {
    throw new PublicError(`Only ${TimeInForce.GTC} orders are currently supported`)
  }
}

module.exports = createOrder
