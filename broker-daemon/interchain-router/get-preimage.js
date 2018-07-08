const { getRecords, Big } = require('../utils')
const { Order } = require('../models')

/**
 * Gets a preimage from another chain by making a payment if the
 * inbound preimage meets its criteria.
 *
 * CURRENTLY UNIMPLEMENTED
 *
 * @param  {Object}        request.params   Parameters of the request
 * @param  {Function}      request.send     Send responses back to the client
 * @param  {Function}      request.onCancel Handle cancellations of the stream by the client
 * @param  {Function}      request.onError  Handle errors in the stream with the client
 * @param  {SublevelIndex} request.ordersByHash Orders for which the broker is the maker, indexed by their swap hash
 * @param  {Object}        request.logger
 * @return {String}        base64 encoded string of the preimage
 */
async function getPreimage ({ params, send, onCancel, onError, ordersByHash, logger }) {
  const {
    paymentHash,
    symbol,
    amount,
    timeLock,
    bestHeight
  } = params

  const range = {
    gte: paymentHash,
    lte: paymentHash
  }
  const orders = await getRecords(ordersByHash, Order.fromStorage.bind(Order), ordersByHash.range(range))

  if (orders.length === 0) {
    throw new Error(`No routing entry available for ${paymentHash}`)
  }

  if (orders.length > 1) {
    throw new Error(`Too many routing entries (${orders.length}) for ${paymentHash}, only expected one.`)
  }

  const [ order ] = orders

  // If we already have the preimage, we should return it immediately - no need to retrieve it from the other
  // network.
  if (order.swapPreimage) {
    send({
      paymentPreimage: order.swapPreimage
    })
    return
  }

  if (order.inboundSymbol !== symbol) {
    throw new Error(`Wrong currency paid in for ${paymentHash}. Expected ${order.inboundSymbol}, found ${symbol}`)
  }

  if (Big(order.inboundAmount).gt(amount)) {
    throw new Error(`Insufficient currency paid in for ${paymentHash}. Expected ${order.inboundAmount}, found ${amount}`)
  }

  if (Big(bestHeight).gte(timeLock)) {
    throw new Error(`Current block height (${bestHeight}) is too high for the extended timelock (${timeLock})`)
  }

  // TODO: check timelock against a grace period
  // TODO: ensure timelock is sufficient for downstream payment
  // TODO: handle client cancellations and errors

  // UNIMPLEMENTED
  send({})
}

module.exports = getPreimage
