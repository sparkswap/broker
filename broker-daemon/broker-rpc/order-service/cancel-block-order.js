/** @typedef {import('../broker-rpc-server').GrpcUnaryMethodRequest} GrpcUnaryMethodRequest */

/**
 * Cancels a block order in progress
 *
 * @param {GrpcUnaryMethodRequest} request - request object
 * @returns {Promise<object>}
 */
async function cancelBlockOrder ({ params, blockOrderWorker }) {
  const {
    blockOrderId
  } = params

  await blockOrderWorker.cancelBlockOrder(blockOrderId)

  return {}
}

module.exports = cancelBlockOrder
