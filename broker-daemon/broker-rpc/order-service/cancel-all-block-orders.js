/**
 * Cancels a block order in progress
 *
 * @param {GrpcUnaryMethod~request} request - request object
 * @param {Object} request.params - Request parameters from the client
 * @param {BlockOrderWorker} request.blockOrderWorker
 * @param {Object} request.logger
 * @returns {Promise<Object>}
 */
async function cancelAllBlockOrders ({ params, logger, blockOrderWorker }) {
  const { market } = params

  const {
    cancelledOrders,
    failedToCancelOrders
  } = await blockOrderWorker.cancelActiveOrders(market)

  return { cancelledOrders, failedToCancelOrders }
}

module.exports = cancelAllBlockOrders
