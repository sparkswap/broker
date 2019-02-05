/**
 * Creates an order with the relayer
 *
 * @param {GrpcUnaryMethod~request} request - request object
 * @param {Object} request.params - Request parameters from the client
 * @param {Object} request.blockOrderWorker
 * @param {Object} responses
 * @param {Function} responses.CreateBlockOrderResponse - constructor for CreateBlockOrderResponse messages
 * @param {Object} responses.TimeInForce - Time In Force enum
 * @returns {CreateBlockOrderResponse}
 */
async function createBlockOrder ({ params, blockOrderWorker }, { CreateBlockOrderResponse, TimeInForce }) {
  const {
    amount,
    limitPrice,
    isMarketOrder,
    market,
    side,
    timeInForce
  } = params

  if (TimeInForce[timeInForce] !== TimeInForce.GTC) {
    throw new Error('Only Good-til-cancelled orders are currently supported')
  }

  const blockOrderId = await blockOrderWorker.createBlockOrder({
    marketName: market,
    side: side,
    amount: amount,
    price: isMarketOrder ? null : limitPrice,
    timeInForce: 'GTC'
  })

  return new CreateBlockOrderResponse({ blockOrderId })
}

module.exports = createBlockOrder
