/**
 * Creates an order with the relayer
 *
 * @param {GrpcUnaryMethod~request} request - request object
 * @param {object} request.params - Request parameters from the client
 * @param {object} request.blockOrderWorker
 * @param {object} responses
 * @param {Function} responses.CreateBlockOrderResponse - constructor for CreateBlockOrderResponse messages
 * @param {object} responses.TimeInForce - Time In Force enum
 * @returns {Promise<CreateBlockOrderResponse>}
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

  if ((TimeInForce[timeInForce] !== TimeInForce.GTC) && (TimeInForce[timeInForce] !== TimeInForce.PO)) {
    throw new Error('Only Good-til-cancelled and Post Only limit orders are currently supported.')
  }

  const blockOrderId = await blockOrderWorker.createBlockOrder({
    marketName: market,
    side,
    amount,
    price: isMarketOrder ? null : limitPrice,
    timeInForce
  })

  return new CreateBlockOrderResponse({ blockOrderId })
}

module.exports = createBlockOrder
