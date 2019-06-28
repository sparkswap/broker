const {
  logger,
  delay
} = require('../utils')

const { ERRORS: ENGINE_ERRORS } = require('lnd-engine')

/**
 * A description of a payment on a Payment Channel Network
 * @typedef {Object} Payment
 * @property {Engine} engine      - Engine for the interacting with the payment
 * @property {string} amount      - Amount, in the smallest unit, of the payment
 * @property {string} address     - Payment Channel Network address of the node
 *                                  the payment is to.
 */

/**
 * Numer of milliseconds between each attempt to resolve a translation across
 * chains. This happens when we encounter a temporary error. We need to keep
 * retrying so as to not end up in a non-atomic state, but if we retry too
 * frequently we could continually flap. This delay ensures we stay atomic,
 * but without needlessly looping over the same error.
 * @type {number}
 */
const RETRY_DELAY = 30000

/**
 * The default amount of time, in seconds, that the Maker will use in forwarding
 * this transaction. LND's default value announced on its channels is 24 hours
 * (144 Bitcoin blocks)
 *
 * @todo Make this amount dynamic and determined with the price/amount or
 *       determined from the channel graph
 * @type {Number}
 * @constant
 */
const DEFAULT_MAKER_FWD_DELTA = 86400

/**
 * The default amount of time, in seconds, that the Relayer will use in
 * forwarding this transaction. LND's default value announced on its channels is
 * 24 hours (144 Bitcoin blocks).
 *
 * @todo Make this amount dynamic and published by the Relayer or determined
 *       from the channel graph
 * @type {Number}
 * @constant
 */
const DEFAULT_RELAYER_FWD_DELTA = 86400

/**
 * The default amoumt of time, in seconds, that the Taker (this node) expects to
 * receive when settling a swap. BOLT-11 states it as 90 minutes (9 Bitcoin
 * blocks), but LND's default is 144 blocks to align to the forwarding policy.
 *
 * @see {@link https://github.com/lightningnetwork/lightning-rfc/blob/master/11-payment-encoding.md}
 * @todo Make this amount dynamic and set by the broker/user
 * @type {Number}
 * @constant
 */
const DEFAULT_MIN_FINAL_DELTA = 86400

/**
 * The amount of time, in seconds, that we'd like to buffer any output timelock
 * by to account for block ticks during a swap This is especially problematic on
 * regtest where we mine blocks every 10 seconds and is a known issue on
 * mainnet.
 *
 * @see {@link https://github.com/lightningnetwork/lnd/issues/535}
 * @type {Number}
 * @constant
 */
const BLOCK_BUFFER = 1200

/**
 * The minimum time lock (in seconds) on extended HTLCs in order for them to be
 * accepted. This assumes a static route from this node, through the Relayer,
 * to the receiving node.
 *
 * @todo Make this value dynamic to accept different routes
 * and different forwarding policies / final cltv deltas
 * @type {number}
 * @constant
 * @returns {number} Time delta in seconds
 */
const OUTBOUND_TIME_LOCK = DEFAULT_RELAYER_FWD_DELTA + DEFAULT_MIN_FINAL_DELTA + BLOCK_BUFFER

/**
 * The minimum time lock (in seconds) on inbound HTLCs for us to accept them and
 * be able to forward them on.
 *
 * @todo Make this value dynamic to accept different routes
 * and different forwarding policies / final cltv deltas
 * @type {number}
 * @constant
 */
const INBOUND_TIME_LOCK = OUTBOUND_TIME_LOCK + DEFAULT_MAKER_FWD_DELTA + BLOCK_BUFFER

/**
 * Prepare for a swap by setting up a hold invoice
 * on the inbound chain.
 *
 * @public
 *
 * @param {string}  hash                  - Base64 string of the hash for the
 *                                          swap
 * @param {Payment} inboundPayment
 * @param {Engine}  inboundPayment.engine - Engine of the expected inbound
 *                                          payment
 * @param {number}  inboundPayment.amount - Amount, in the smallest unit, of the
 *                                          expected inbound payment.
 * @param {Date}    timeout               - Absolute time after which the
 *                                          payment should not be translated.
 */
async function prepareSwap (hash, { engine, amount }, timeout) {
  // TODO: update `prepareSwap` to take an expiration
  // time (absolute) and a minimum time lock in seconds
  // TODO: update `prepareSwap` to be idempotent
  await engine.prepareSwap(
    hash,
    amount,
    INBOUND_TIME_LOCK,
    timeout
  )
}

/**
 * Get the preimage for a swap from one of its three potential sources:
 * - from an existing outbound payment
 * - from an existing settled inbound invoice
 * - from a new outbound payment
 *
 * @private
 *
 * @param {string}  hash                    - Base64 string of the hash for the
 *                                            swap
 * @param {Payment} inboundPayment
 * @param {Engine}  inboundPayment.engine   - Engine of the expected inbound
 *                                            payment
 * @param {Payment} outboundPayment
 * @param {Engine}  outboundPayment.engine  - Engine of the outbound
 *                                            payment
 * @param {number}  outboundPayment.amount  - Amount, in the smallest unit, of
 *                                            the outbound payment to be made.
 * @param {number}  outboundPayment.address - Address to send the outbound
 *                                            payment to to retrieve the
 *                                            preimage.
 * @returns {string}                          Base64 encoded preimage for the
 *                                            swap.
 */
async function getPreimage (
  hash,
  { engine: inboundEngine },
  { engine: outboundEngine, amount: outboundAmount, address: outboundAddress }
) {
  // We don't want to reject an incoming HTLC if we know that there is an
  // active outgoing one. If the outgoing HTLC is in flight or completed, we
  // should attempt to retrieve the associated preimage.
  logger.debug(`Checking outbound HTLC status for swap ${hash}`)
  if (await outboundEngine.isPaymentPendingOrComplete(hash)) {
    // TODO: return permanent errors when encountered
    return outboundEngine.getPaymentPreimage(hash)
  }

  let committedTime

  // wait for an incoming payment to this hash that is accepted,
  // but not yet settled.
  try {
    committedTime = await inboundEngine.waitForSwapCommitment(hash)
  } catch (e) {
    if (e instanceof ENGINE_ERRORS.SettledSwapError) {
      logger.debug(`Swap for ${hash} has already been settled`)

      return inboundEngine.getSettledSwapPreimage(hash)
    }

    throw e
  }

  // add our static time lock to the time the inbound contract was locked
  // in to arrive at the latest time that our outbound contract can be
  // resolved while still considering our state "safe" and atomic.
  const maxTime = new Date(committedTime.getTime() + (OUTBOUND_TIME_LOCK * 1000))

  logger.debug(`Sending payment to ${outboundAddress} to translate ${hash}`, {
    maxTime,
    outboundAmount
  })

  return outboundEngine.translateSwap(
    outboundAddress,
    hash,
    outboundAmount,
    maxTime
  )
}

/**
 * Translate a swap cross-chain by retrieving the preimage from the
 * downstream chain and returning it to the upstream chain, cancelling the
 * upstream when an unrecoverable error is encountered. When any other
 * error is encountered, it retries to protect us against being in a
 * non-atomic state.
 *
 * @public
 *
 * @param {string}  hash                  - Base64 string of the hash for the
 *                                          swap
 * @param {Payment} inboundPayment        - Expected inbound payment
 * @param {Payment} outboundPayment       - Outbound payment we will make to
 *                                          retrieve the preimage.
 * @returns {string}                        Base64 encoded preimage for the swap
 * @throws {Error} If a permanent error is encountered and the swap is cancelled
 */
async function translateSwap (hash, inboundPayment, outboundPayment) {
  try {
    const paymentPreimage = await getPreimage(hash, inboundPayment, outboundPayment)
    logger.debug(`Successfully retrieved preimage for swap ${hash}`)

    logger.debug(`Settling upstream payment for ${hash}`)
    await inboundPayment.engine.settleSwap(paymentPreimage)
    logger.debug(`Successfully settled upstream payment for ${hash}`)

    return paymentPreimage
  } catch (e) {
    if (e instanceof ENGINE_ERRORS.PermanentSwapError) {
      logger.error('Permanent Error encountered while translating swap, ' +
        'cancelling upstream invoice', { error: e.message, hash })

      await inboundPayment.engine.cancelSwap(hash)

      // once we've cancelled, we can re-throw
      throw e
    }

    logger.error('Temporary Error encountered while translating swap',
      { error: e.stack, hash })

    // A temporary error means we don't know the current state, so we need
    // to restart the whole process
    logger.debug(`Delaying swap retry for ${hash} for ${RETRY_DELAY}ms`)
    await delay(RETRY_DELAY)
    logger.debug(`Retrying swap translation for ${hash}`)

    return translateSwap(hash, inboundPayment, outboundPayment)
  }
}

module.exports = {
  prepareSwap,
  translateSwap
}
