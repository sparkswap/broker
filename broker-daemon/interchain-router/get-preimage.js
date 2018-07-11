const { getRecords, Big } = require('../utils')
const { Order } = require('../models')

/**
 * Default amount of time to deduct from the incoming HTLC to ensure we have enough timelock
 * @type {Number}
 * @constant
 */
const DEFAULT_TIMELOCK_DELTA = 144

/**
 * Gets a preimage from another chain by making a payment if the
 * inbound preimage meets its criteria.
 *
 * @param  {Object}             request.params   Parameters of the request
 * @param  {Function}           request.send     Send responses back to the client
 * @param  {Function}           request.onCancel Handle cancellations of the stream by the client
 * @param  {Function}           request.onError  Handle errors in the stream with the client
 * @param  {SublevelIndex}      request.ordersByHash Orders for which the broker is the maker, indexed by their swap hash
 * @param  {Map<String, Engine} request.engines All available engines
 * @param  {Object}             request.logger
 */
async function getPreimage ({ params, send, onCancel, onError, ordersByHash, engines, logger = console }) {
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

  // We are assuming that only one order has this swap hash. Any more and we have an error of internal
  // consistency. Any less and we don't actually know about this swap.
  const orders = await getRecords(ordersByHash, Order.fromStorage.bind(Order), ordersByHash.range(range))

  if (orders.length === 0) {
    throw new Error(`No routing entry available for ${paymentHash}`)
  }

  if (orders.length > 1) {
    throw new Error(`Too many routing entries (${orders.length}) for ${paymentHash}, only expected one.`)
  }

  const [ order ] = orders

  const { inboundSymbol, inboundAmount, outboundSymbol, outboundAmount, takerAddress } = order

  if (inboundSymbol !== symbol) {
    throw new Error(`Wrong currency paid in for ${paymentHash}. Expected ${inboundSymbol}, found ${symbol}`)
  }

  if (Big(inboundAmount).gt(amount)) {
    throw new Error(`Insufficient currency paid in for ${paymentHash}. Expected ${inboundAmount}, found ${amount}`)
  }

  if (Big(bestHeight).gte(timeLock)) {
    throw new Error(`Current block height (${bestHeight}) is too high for the extended timelock (${timeLock})`)
  }

  const timeLockDeltaToExtend = Big(timeLock).minus(bestHeight).minus(DEFAULT_TIMELOCK_DELTA)

  if (timeLockDeltaToExtend.lte(0)) {
    throw new Error(`Not enough time lock extended for translating swap. Expected at least ${DEFAULT_TIMELOCK_DELTA}, got ${timeLockDeltaToExtend.toString()}`)
  }

  // TODO: check timelock against a grace period
  // TODO: ensure timelock is sufficient for downstream payment
  // TODO: handle client cancellations and errors
  // TODO: ensure no other clients are requesting this right now (lock the order?)

  const engine = engines.get(outboundSymbol)
  if (!engine) {
    throw new Error(`No engine available for ${outboundSymbol}`)
  }

  logger.debug(`Sending payment to ${takerAddress} to translate swap ${paymentHash}`)
  const paymentPreimage = await engine.translateSwap(takerAddress, paymentHash, outboundAmount, timeLockDeltaToExtend.toString())
  logger.debug(`Completed payment to ${takerAddress} for swap ${paymentHash}`)

  // Note: we do NOT save the order here. The Interchain Router should treat orders as Read-only routing entries
  // Any state should be maintained by the engines themselves and the OrderStateMachine

  send({ paymentPreimage })
}

module.exports = getPreimage
