const { GrpcResponse: CreateBlockOrderResponse } = require('../../utils')

/** @typedef {import('../broker-rpc-server').GrpcUnaryMethodRequest} GrpcUnaryMethodRequest */

/**
 * Creates an order with the relayer
 *
 * @param {GrpcUnaryMethodRequest} request - request object
 * @param {object} responses
 * @param {object} responses.TimeInForce - Time In Force enum
 * @returns {Promise<CreateBlockOrderResponse>}
 */
async function createBlockOrder ({ params, blockOrderWorker }, { TimeInForce }) {
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
