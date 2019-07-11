/**
 * Cancels a block order in progress
 *
 * @param {GrpcUnaryMethod~request} request - request object
 * @param {object} request.params - Request parameters from the client
 * @param {BlockOrderWorker} request.blockOrderWorker
 * @param {object} request.logger
 * @returns {Promise<object>}
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
