const nano = require('nano-seconds')
const { promisify } = require('util')
const { GrpcResponse, Big } = require('../../utils')

/** @typedef {import('../broker-rpc-server').GrpcUnaryMethodRequest} GrpcUnaryMethodRequest */

/** @typedef {object} Amount
 * @property {string} symbol
 * @property {string} value
 */

/** @typedef {object} OrderRequest
 * @property {Amount} sourceAmount
 * @property {string} sourceAddress
 * @property {Amount} destinationAmount
 * @property {string} destinationAddress
 * @property {string} roleRestriction
 */

/**
 * Normalize numeric string
 * @param {string} value
 * @returns {string}
 */
function normalizeValue (value) {
  return (new Big(value)).toString()
}

/**
 * Normalize numeric strings in an amount
 * @param {Amount} amount
 * @returns {Amount}
 */
function normalizeAmount (amount) {
  return Object.assign({}, amount, { value: normalizeValue(amount.value) })
}

/**
 * Normalize numeric strings in an order
 * @param {OrderRequest} order
 * @returns {OrderRequest}
 */
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
  const timestamp = nano.toString(nano.now())
  const authorization = relayer.identity.authorize()
  const { orderId } = await relayer.orderService.createOrder(params, authorization)
  const order = Object.assign({}, normalizeOrder(params), { timestamp })
  await promisify(store.sublevel('orders2').put)(orderId, order)
  return new GrpcResponse({ orderId })
}

module.exports = createOrder
