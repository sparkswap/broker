/**
 * Retrieve all block orders for the given market
 *
 * @param {GrpcUnaryMethod~request} request - request object
 * @param {Object} request.params - Request parameters from the client
 * @param {BlockOrderWorker} request.blockOrderWorker
 * @param {Object} request.logger
 * @param {Object} responses
 * @param {Function} responses.GetBlockOrdersResponse - constructor for GetBlockOrdersResponse messages
 * @returns {Promise<GetBlockOrdersResponse>}
 */
async function getBlockOrders ({ params, logger, blockOrderWorker }, { GetBlockOrdersResponse }) {
  let { options } = params

  // If no options are passed, then we'll make sure to default the options arg to
  // an empty object to accessor issues
  if (!options) {
    options = {}
  }

  // We re-construct our query options to get rid of values that we dont know about
  const queryOptions = {
    limit: options.limit,
    active: options.active,
    cancelled: options.cancelled,
    completed: options.completed,
    failed: options.failed
  }

  try {
    logger.info('Getting all block orders', { startTime: new Date(), queryOptions })
    const orders = await blockOrderWorker.getBlockOrders(params.market, queryOptions)
    logger.info('Finished getting block orders', { endTime: new Date() })

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
