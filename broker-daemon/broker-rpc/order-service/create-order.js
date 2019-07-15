const { promisify } = require('util')
const { GrpcResponse } = require('../../utils')

/** @typedef {import('../broker-rpc-server').GrpcUnaryMethodRequest} GrpcUnaryMethodRequest */

/**
 * Creates an order with the relayer
 *
 * @param {GrpcUnaryMethodRequest} orderRequest
 * @returns {Promise<GrpcResponse>}
 */
async function createOrder ({ params, relayer, store }) {
  const { orderId } = await relayer.orderService.createOrder(params)
  await promisify(store.sublevel('orders').put)(orderId, params)
  return new GrpcResponse({ orderId })
}

module.exports = createOrder
