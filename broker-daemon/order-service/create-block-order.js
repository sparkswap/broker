const { PublicError } = require('grpc-methods')
const { Big } = require('../utils')
const CONFIG = require('../config')

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
    limitPrice,
    isMarketOrder,
    market,
    side,
    timeInForce
  } = params

  if (TimeInForce[timeInForce] !== TimeInForce.GTC) {
    throw new PublicError('Only Good-til-cancelled orders are currently supported')
  }

  const baseSymbol = market.split('/')[0].toUpperCase()
  const currencyConfig = CONFIG.currencies.find(({ symbol }) => symbol === baseSymbol)

  if(!currencyConfig) {
    throw new PublicError(`No currency configuration is available for ${baseSymbol}`)
  }

  const baseUnitAmount = Big(amount).times(currencyConfig.multipleOfSmallestUnit)
  if(!baseUnitAmount.eq(baseUnitAmount.round())) {
    throw new Error(`Amount is too precise for ${baseSymbol}`)
  }

  const blockOrderId = await blockOrderWorker.createBlockOrder({
    marketName: market,
    side: side,
    amount: baseUnitAmount.toString(),
    price: isMarketOrder ? null : limitPrice,
    timeInForce: 'GTC'
  })

  return new CreateBlockOrderResponse({ blockOrderId })
}

module.exports = createBlockOrder
