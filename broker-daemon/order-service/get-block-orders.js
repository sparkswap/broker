/**
 * Retrieve all block orders for the given market
 *
 * @param {GrpcUnaryMethod~request} request - request object
 * @param {Object} request.params - Request parameters from the client
 * @param {BlockOrderWorker} request.blockOrderWorker
 * @param {Object} request.logger
 * @param {Object} responses
 * @param {function} responses.GetBlockOrdersResponse - constructor for GetBlockOrdersResponse messages
 * @return {responses.GetBlockOrdersResponse}
 */
async function getBlockOrders ({ params, logger, blockOrderWorker }, { GetBlockOrdersResponse }) {
  try {
    const blockOrders = await blockOrderWorker.getBlockOrders(params.market)
    return new GetBlockOrdersResponse({blockOrders: blockOrders.map((blockOrder) => blockOrder.serializeSummary())})
  } catch (err) {
    throw new Error(err.message)
  }
}

module.exports = getBlockOrders
