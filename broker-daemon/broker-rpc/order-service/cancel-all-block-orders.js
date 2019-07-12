/** @typedef {import('../broker-rpc-server').GrpcUnaryMethodRequest} GrpcUnaryMethodRequest */

/**
 * Cancels a block order in progress
 *
 * @param {GrpcUnaryMethodRequest} request - request object
 * @returns {Promise<object>}
 */
async function cancelAllBlockOrders ({ params, blockOrderWorker }) {
  const { market } = params

  const {
    cancelledOrders,
    failedToCancelOrders
  } = await blockOrderWorker.cancelActiveOrders(market)

  return { cancelledOrders, failedToCancelOrders }
}

module.exports = cancelAllBlockOrders
