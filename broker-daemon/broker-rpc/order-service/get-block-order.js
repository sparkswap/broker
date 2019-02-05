/**
 * Check on the status of a block order
 *
 * @param {GrpcUnaryMethod~request} request - request object
 * @param {Object} request.params - Request parameters from the client
 * @param {BlockOrderWorker} request.blockOrderWorker
 * @param {Object} request.logger
 * @param {Object} responses
 * @param {Function} responses.GetBlockOrderResponse - constructor for GetBlockOrderResponse messages
 * @return {responses.GetBlockOrderResponse}
 */
async function getBlockOrder ({ params, logger, blockOrderWorker }, { GetBlockOrderResponse }) {
  const {
    blockOrderId
  } = params

  const blockOrder = await blockOrderWorker.getBlockOrder(blockOrderId)

  // the grpc response constructor does not properly serialize oneof fields, and tries to send both
  // when sending the limitPrice, it sends it as an object to encode the in64, which fails on the wire
  // so instead, we use a plain object
  return blockOrder.serialize()
}

module.exports = getBlockOrder
