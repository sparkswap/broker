const { PublicError } = require('grpc-methods')
const { BlockOrder } = require('../../models')

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

  try {
    await blockOrderWorker.cancelBlockOrder(blockOrderId)

    return {}
  } catch (err) {
    if (err instanceof BlockOrder.ERRORS.BlockOrderNotFoundError) {
      throw new PublicError(err.message, err)
    }

    throw err
  }
}

module.exports = cancelBlockOrder
