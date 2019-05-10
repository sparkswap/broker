/**
 * Retrieve all block orders for the given market
 *
 * @param {GrpcUnaryMethod~request} request - request object
 * @param {Object} request.params - Request parameters from the client
 * @param {BlockOrderWorker} request.blockOrderWorker
 * @param {Object} request.logger
 * @param {Object} responses
 * @param {Function} responses.GetBlockOrdersResponse - constructor for GetBlockOrdersResponse messages
 * @returns {GetBlockOrdersResponse}
 */
async function getBlockOrders ({ params, logger, blockOrderWorker }, { GetBlockOrdersResponse }) {
  try {
    logger.info(new Date())
    const orders = await blockOrderWorker.getBlockOrders(params.market)
    logger.info(new Date())
    const blockOrders = orders.map(order => order.serializeSummary())
    logger.info(`Block order length: ${blockOrders.length}`)

    // The gRPC constructor does not serialize block orders correctly, so we instead
    // return an object.
    return { blockOrders }
  } catch (err) {
    throw new Error(err.message)
  }
}

module.exports = getBlockOrders
