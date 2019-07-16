const nano = require('nano-seconds')
const { promisify } = require('util')
const { GrpcResponse, Big } = require('../../utils')

/** @typedef {import('../broker-rpc-server').GrpcUnaryMethodRequest} GrpcUnaryMethodRequest */

function normalizeValue (value) {
  return (new Big(value)).toString()
}

function normalizeAmount (amount) {
  return Object.assign({}, amount, { value: normalizeValue(amount.value) })
}

function normalizeOrder (order) {
  return Object.assign({}, order, {
    sourceAmount: normalizeAmount(order.sourceAmount),
    destinationAmount: normalizeAmount(order.destinationAmount)
  })
}

/**
 * Creates an order with the relayer
 *
 * @param {GrpcUnaryMethodRequest} orderRequest
 * @returns {Promise<GrpcResponse>}
 */
async function createOrder ({ params, relayer, store }) {
  const authorization = relayer.identity.authorize()
  const timestamp = nano.toString(nano.now())
  const { orderId } = await relayer.orderService.createOrder(params, authorization)
  const order = Object.assign({}, normalizeOrder(params), { timestamp })
  await promisify(store.sublevel('orders2').put)(orderId, order)
  return new GrpcResponse({ orderId })
}

module.exports = createOrder
