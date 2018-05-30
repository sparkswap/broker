const { PublicError } = require('grpc-methods')

/**
 * Check on the status of a block order
 *
 * @param {GrpcUnaryMethod~request} request - request object
 * @param {Object} request.params - Request parameters from the client
 * @param {BlockOrderWorker} request.blockOrderWorker
 * @param {Object} request.logger
 * @param {Object} responses
 * @param {function} responses.GetBlockOrderResponse - constructor for GetBlockOrderResponse messages
 * @return {responses.GetBlockOrderResponse}
 */
async function getBlockOrder ({ params, logger, blockOrderWorker }, { GetBlockOrderResponse }) {
  const {
    blockOrderId
  } = params

  try {
    const blockOrder = await blockOrderWorker.getBlockOrder(blockOrderId)
    return new GetBlockOrderResponse(blockOrder.serialize())
  } catch(err) {
    if(err.notFound) {
      throw new PublicError(`No Block Order with ID ${blockOrderId}`)
    }

    throw err
  }
}

module.exports = getBlockOrder
