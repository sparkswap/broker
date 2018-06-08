const { PublicError } = require('grpc-methods')

/**
 * Creates an order with the relayer
 *
 * @param {GrpcUnaryMethod~request} request - request object
 * @param {Object} request.params - Request parameters from the client
 * @param {Object} request.blockOrderWorker
 * @param {Object} responses
 * @param {function} responses.CreateBlockOrderResponse - constructor for CreateBlockOrderResponse messages
 * @param {Object} responses.TimeInForce - Time In Force enum
 * @return {responses.CreateBlockOrderResponse}
 */
async function createBlockOrder ({ params, blockOrderWorker }, { CreateBlockOrderResponse, TimeInForce }) {
  const {
    amount,
    price,
    isMarketOrder,
    market,
    side,
    timeInForce
  } = params

  if (TimeInForce[timeInForce] !== TimeInForce.GTC) {
    throw new PublicError('Only Good-til-cancelled orders are currently supported')
  }

  const blockOrderId = await blockOrderWorker.createBlockOrder({
    marketName: market,
    side: side,
    amount,
    price: isMarketOrder ? null : price,
    timeInForce: 'GTC'
  })

  return new CreateBlockOrderResponse({ blockOrderId })
}

module.exports = createBlockOrder
