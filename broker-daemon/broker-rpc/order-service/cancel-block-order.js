/**
 * Cancels a block order in progress
 *
 * @param {GrpcUnaryMethod~request} request - request object
 * @param {Object} request.params - Request parameters from the client
 * @param {BlockOrderWorker} request.blockOrderWorker
 * @param {Object} request.logger
 * @return {Object}
 */
async function cancelBlockOrder ({ params, logger, blockOrderWorker }) {
  const {
    blockOrderId
  } = params

  await blockOrderWorker.cancelBlockOrder(blockOrderId)

  return {}
}

module.exports = cancelBlockOrder
