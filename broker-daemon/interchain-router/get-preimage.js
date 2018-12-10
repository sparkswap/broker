const { getRecords, Big } = require('../utils')
const { Order } = require('../models')
const fromStorage = Order.fromStorage.bind(Order)

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
 * Convert the time lock of the HTLC to a delta time lock expressed in seconds
 * @param  {Engine} inboundEngine engine of the inbound node
 * @param  {String} timeLock      time lock extended to the inbound node in blocks
 * @param  {String} bestHeight    current height of the inbound node's blockchain
 * @return {String} Time, in seconds, of the extended time lock
 */
function timeLockDeltaInSeconds (inboundEngine, timeLock, bestHeight) {
  const timeLockDelta = Big(timeLock).minus(bestHeight)

  if (timeLockDelta.lte(0)) {
    throw new Error(`Current block height (${bestHeight}) is higher than the extended timelock (${timeLock})`)
  }

  return timeLockDelta.times(inboundEngine.currencyConfig.secondsPerBlock).toString()
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
  const swapHash = paymentHash

  let order

  try {
    order = await getRoutingEntry(ordersByHash, swapHash)
  } catch (err) {
    logger.error(err)
    return send({ permanentError: err.message })
  }

  const { inboundSymbol, inboundFillAmount, outboundSymbol, outboundFillAmount, takerAddress } = order
  const [ expectedSymbol, actualSymbol, expectedAmount, actualAmount ] = [ inboundSymbol, symbol, inboundFillAmount, amount ]

  const outboundEngine = engines.get(outboundSymbol)
  if (!outboundEngine) {
    const err = `No engine available for ${outboundSymbol}`
    logger.error(err)
    return send({ permanentError: err })
  }

  if (await outboundEngine.isPaymentPendingOrComplete(swapHash)) {
    const { paymentPreimage, permanentError } = await outboundEngine.getPaymentPreimage(swapHash)
    return send({ paymentPreimage, permanentError })
  }

  if (expectedSymbol !== actualSymbol) {
    const err = `Wrong currency paid in for ${swapHash}. Expected ${expectedSymbol}, found ${actualSymbol}`
    logger.error(err)
    return send({ permanentError: err })
  }
  if (Big(expectedAmount).gt(actualAmount)) {
    const err = `Insufficient currency paid in for ${swapHash}. Expected ${expectedAmount}, found ${actualAmount}`
    logger.error(err)
    return send({ permanentError: err })
  }

  const inboundEngine = engines.get(inboundSymbol)
  if (!inboundEngine) {
    const err = `No engine available for ${inboundSymbol}`
    logger.error(err)
    return send({ permanentError: err })
  }

  let timeLockDelta
  try {
    timeLockDelta = timeLockDeltaInSeconds(inboundEngine, timeLock, bestHeight)
  } catch (err) {
    logger.error(err)
    return send({ permanentError: err.message })
  }

  logger.debug(`Sending payment to ${takerAddress} to translate swap ${swapHash}`)
  const { paymentPreimage, permanentError } = await outboundEngine.translateSwap(takerAddress, swapHash, outboundFillAmount, timeLockDelta)

  if (permanentError) {
    logger.error(permanentError)
    return send({ permanentError })
  }

  logger.debug(`Completed payment to ${takerAddress} for swap ${swapHash}`)

  // Note: we do NOT save the order here. The Interchain Router should treat orders as Read-only routing entries
  // Any state should be maintained by the engines themselves and the OrderStateMachine

  send({ paymentPreimage })
}

module.exports = getPreimage
