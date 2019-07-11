const { GrpcResponse: GetTradeHistoryResponse } = require('../../utils')

/** @typedef {import('../broker-rpc-server').GrpcUnaryMethodRequest} GrpcUnaryMethodRequest */

/**
 * Retrieve information about completed trades
 *
 * @param {GrpcUnaryMethodRequest} request - request object
 * @return {Promise<GetTradeHistoryResponse>}
 */

async function getTradeHistory ({ logger, blockOrderWorker }) {
  try {
    const { orders, fills } = await blockOrderWorker.getTrades()

    return new GetTradeHistoryResponse({
      orders,
      fills
    })
  } catch (err) {
    logger.error('Received error when grabbing trades', { error: err.stack })
    throw new Error(err.message)
  }
}

module.exports = getTradeHistory
