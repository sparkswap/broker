const {
  logger,
  delay
} = require('../utils')

const { ERRORS: ENGINE_ERRORS } = require('lnd-engine')

/** @typedef {import('..').Engine} Engine */

/**
 * A description of a payment on a Payment Channel Network
 * @typedef {object} Payment
 * @property {Engine} engine      - Engine for interacting with the payment
 * @property {string} amount      - Amount, in the smallest unit, of the payment
 * @property {string} address     - Payment Channel Network address of the node
 *                                  the payment is to.
 */

/**
 * Number of milliseconds between each attempt to resolve a translation across
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
 * @type {number}
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
 * @type {number}
 * @constant
 */
const DEFAULT_RELAYER_FWD_DELTA = 86400

/**
 * The default amount of time, in seconds, that the Taker (this node) expects to
 * receive when settling a swap. BOLT-11 states it as 90 minutes (9 Bitcoin
 * blocks), but LND's default is 144 blocks to align to the forwarding policy.
 *
 * @see {@link https://github.com/lightningnetwork/lightning-rfc/blob/master/11-payment-encoding.md}
 * @todo Make this amount dynamic and set by the broker/user
 * @type {number}
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
 * @type {number}
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
 * @param {Date}    timeout               - Absolute time after which the
 *                                          payment should not be translated.
 */
async function prepareSwap (hash, { engine, amount }, timeout) {
  await engine.prepareSwap(
    hash,
    amount,
    timeout,
    INBOUND_TIME_LOCK
  )
}

/**
 * Translate a swap payment to the other chain in an idempotent fashion,
 * i.e. by only paying the downstream invoice if it is not available any
 * other way. This is done by retrieving the preimage:
 * - from an existing outbound payment
 * - from an existing settled inbound invoice
 * - by making a new outbound payment
 *
 * @private
 *
 * @param {string}  hash                    - Base64 string of the hash for the
 *                                            swap
 * @param {Payment} inboundPayment
 * @param {Payment} outboundPayment
 * @returns {Promise<string>}                 Base64 encoded preimage for the
 *                                            swap.
 */
async function translateIdempotent (
  hash,
  { engine: inboundEngine },
  { engine: outboundEngine, amount: outboundAmount, address: outboundAddress }
) {
  let committedTime

  try {
    committedTime = await inboundEngine.waitForSwapCommitment(hash)
  } catch (e) {
    if (e instanceof ENGINE_ERRORS.SettledSwapError) {
      logger.debug(`Swap for ${hash} has already been settled`)

      return inboundEngine.getSettledSwapPreimage(hash)
    }

    throw e
  }

  // add our static time lock to the time the inbound contract was accepted
  // to arrive at the latest time that our outbound contract can be
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
 * Cancel an upstream payment for a swap.
 *
 * @private
 *
 * @param   {Engine} engine
 * @param   {string} hash     - Base64 string of the swap hash
 * @param   {Error}  error    - Error that caused the cancel
 * @returns {Promise<void>}
 */
async function cancelSwap (engine, hash, error) {
  logger.error('Permanent Error encountered while translating swap, ' +
    'cancelling upstream invoice', { error: error.message, hash })

  return engine.cancelSwap(hash)
}

/**
 * Settle an upstream payment for a swap.
 *
 * @private
 *
 * @param   {Engine} engine
 * @param   {string} hash     - Base64 string of the swap hash
 * @param   {string} preimage - Base64 string of the swap preimage
 * @returns {Promise<void>}
 */
async function settleSwap (engine, hash, preimage) {
  logger.debug(`Settling upstream payment for ${hash}`)
  await engine.settleSwap(preimage)
  logger.debug(`Successfully settled upstream payment for ${hash}`)
}

/**
 * Retry forwarding a swap across chains.
 *
 * @private
 *
 * @param {string}  hash                  - Base64 string of the hash for the
 *                                          swap
 * @param {Payment} inboundPayment        - Expected inbound payment
 * @param {Payment} outboundPayment       - Outbound payment we will make to
 *                                          retrieve the preimage.
 * @param {Error}   error                 - Error that caused the retry
 * @returns {Promise<string>}               Base64 encoded preimage for the swap
 */
async function retryForward (hash, inboundPayment, outboundPayment, error) {
  logger.error('Temporary Error encountered while forwarding swap',
    { error: error.stack, hash })

  logger.debug(`Delaying swap forward retry for ${hash} for ${RETRY_DELAY}ms`)
  await delay(RETRY_DELAY)
  logger.debug(`Retrying swap forward for ${hash}`)

  return forwardSwap(hash, inboundPayment, outboundPayment)
}

/**
 * Forward a swap cross-chain by retrieving the preimage from the
 * downstream chain (by paying an invoice to its hash) and returning it
 * to the upstream chain, cancelling the upstream when an unrecoverable
 * error is encountered. When any other error is encountered, it retries
 * to protect us against being in a non-atomic state.
 *
 * @public
 *
 * @param {string}  hash                  - Base64 string of the hash for the
 *                                          swap
 * @param {Payment} inboundPayment        - Expected inbound payment
 * @param {Payment} outboundPayment       - Outbound payment we will make to
 *                                          retrieve the preimage.
 * @returns {Promise<string>}               Base64 encoded preimage for the swap
 * @throws {Error} If a permanent error is encountered and the swap is cancelled
 */
async function forwardSwap (hash, inboundPayment, outboundPayment) {
  try {
    const paymentPreimage = await translateIdempotent(hash, inboundPayment, outboundPayment)
    logger.debug(`Successfully retrieved preimage for swap ${hash}`)

    await settleSwap(inboundPayment.engine, hash, paymentPreimage)

    return paymentPreimage
  } catch (e) {
    if (e instanceof ENGINE_ERRORS.PermanentSwapError) {
      await cancelSwap(inboundPayment.engine, hash, e)

      throw e
    }

    if (e instanceof ENGINE_ERRORS.CanceledSwapError) {
      logger.error(`Swap for ${hash} has been cancelled upstream. ` +
        'We may be in a non-atomic state (if the downstream is still active), ' +
        'or be retrying a cancelled swap.')
      // When an invoice is cancelled upstream, we are either in non-atomic state
      // (which we can do nothing about) or the swap itself has already been cancelled.
      // We treat it as though it is cancelled, throwing an error without retrying,
      // since the non-atomic state is not actionable, and retrying will put us in an
      // infinite loop.
      throw e
    }

    // A temporary (non-permanent) error means we don't know the current state,
    // so we need to restart the whole process
    return retryForward(hash, inboundPayment, outboundPayment, e)
  }
}

module.exports = {
  prepareSwap,
  forwardSwap
}
