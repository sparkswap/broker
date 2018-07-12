const { getRecords, Big } = require('../utils')
const { Order } = require('../models')
const fromStorage = Order.fromStorage.bind(Order)

/**
 * Default amount of time to deduct from the incoming HTLC to ensure we have enough timelock
 * Amount of time, in seconds, to deduct from the incoming HTLC to ensure we have enough timelock
 * for forwarding the swap.
 * LND's default is 24 hours (144 Bitcoin blocks).
 * @type {Number}
 * @constant
 */
const DEFAULT_FWD_DELTA = 86400

/**
 * Get a routing entry (an order) for a specified swap hash
 * @param  {SublevelIndex} ordersByHash Orders for which the broker is the maker, indexed by their swap hash
 * @param  {String}        swapHash     swap hash of the order to retrieve
 * @return {Order}
 */
async function getRoutingEntry (ordersByHash, swapHash) {
  const range = {
    gte: swapHash,
    lte: swapHash
  }

  // We are assuming that only one order has this swap hash. Any more and we have an error of internal
  // consistency. Any less and we don't actually know about this swap.
  const orders = await getRecords(ordersByHash, fromStorage, ordersByHash.range(range))

  if (orders.length === 0) {
    throw new Error(`No routing entry available for ${swapHash}`)
  }

  if (orders.length > 1) {
    throw new Error(`Too many routing entries (${orders.length}) for ${swapHash}, only expected one.`)
  }

  const [ order ] = orders

  return order
}

/**
 * Validate that the amount paid in to satisfy a swap actually satisfies the conditions
 * @param  {String} swapHash       Hash of the swap to validate
 * @param  {String} expectedSymbol Symbol we are expecting to be paid
 * @param  {String} actualSymbol   Symbol that the node paid us in
 * @param  {String} expectedAmount Int64 string Amount that we expect to be paid (in integer units)
 * @param  {String} actualAmount   Int64 string Amount that the node paid (in integer units)
 * @return {void}
 */
function assertSufficientCurrency (swapHash, expectedSymbol, actualSymbol, expectedAmount, actualAmount) {
  if (expectedSymbol !== actualSymbol) {
    throw new Error(`Wrong currency paid in for ${swapHash}. Expected ${expectedSymbol}, found ${actualSymbol}`)
  }

  if (Big(expectedAmount).gt(actualAmount)) {
    throw new Error(`Insufficient currency paid in for ${swapHash}. Expected ${expectedAmount}, found ${actualAmount}`)
  }
}

/**
 * Calculate the time lock to extend along the second leg of the swap, and ensure
 * that there is sufficient time for our segment.
 * @param  {Engine} inboundEngine engine of the inbound node
 * @param  {String} timeLock      time lock extended to the inbound node in blocks
 * @param  {String} bestHeight    current height of the inbound node's blockchain
 * @return {String} Time, in seconds, to extend along the entire second leg of the swap
 */
function calculateTimeLock (inboundEngine, timeLock, bestHeight) {
  const timeLockDelta = Big(timeLock).minus(bestHeight)

  if (timeLockDelta.lte(0)) {
    throw new Error(`Current block height (${bestHeight}) is higher than the extended timelock (${timeLock})`)
  }

  const timeLockDeltaInSeconds = timeLockDelta.times(inboundEngine.currencyConfig.secondsPerBlock)
  const timeLockDeltaToExtend = timeLockDeltaInSeconds.minus(DEFAULT_FWD_DELTA)

  if (timeLockDeltaToExtend.lte(0)) {
    throw new Error(`Not enough time lock extended for translating swap. Expected at least ${DEFAULT_FWD_DELTA}, got ${timeLockDeltaInSeconds.toString()}`)
  }

  return timeLockDeltaToExtend.toString()
}

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
 * @todo handle client cancellations and errors and general failures during transition
 */
async function getPreimage ({ params, send, onCancel, onError, ordersByHash, engines, logger = console }) {
  const {
    paymentHash,
    symbol,
    amount,
    timeLock,
    bestHeight
  } = params

  const order = await getRoutingEntry(ordersByHash, paymentHash)

  const { inboundSymbol, inboundAmount, outboundSymbol, outboundAmount, takerAddress } = order

  assertSufficientCurrency(paymentHash, inboundSymbol, symbol, inboundAmount, amount)

  const inboundEngine = engines.get(inboundSymbol)
  if (!inboundEngine) {
    throw new Error(`No engine available for ${inboundSymbol}`)
  }

  const outboundEngine = engines.get(outboundSymbol)
  if (!outboundEngine) {
    throw new Error(`No engine available for ${outboundSymbol}`)
  }

  const timeLockDeltaToExtend = calculateTimeLock(inboundEngine, timeLock, bestHeight)

  logger.debug(`Sending payment to ${takerAddress} to translate swap ${paymentHash}`)
  const paymentPreimage = await outboundEngine.translateSwap(takerAddress, paymentHash, outboundAmount, timeLockDeltaToExtend)
  logger.debug(`Completed payment to ${takerAddress} for swap ${paymentHash}`)

  // Note: we do NOT save the order here. The Interchain Router should treat orders as Read-only routing entries
  // Any state should be maintained by the engines themselves and the OrderStateMachine

  send({ paymentPreimage })
}

module.exports = getPreimage
