/** @typedef {import('../broker-rpc-server').GrpcUnaryMethodRequest} GrpcUnaryMethodRequest */

/**
 * Check on the status of a block order
 *
 * @param {GrpcUnaryMethodRequest} request - request object
 * @returns {Promise<Object>}
 */
async function getBlockOrder ({ params, blockOrderWorker }) {
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
