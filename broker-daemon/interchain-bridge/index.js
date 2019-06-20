const { logger } = require('../utils')

/**
 * A description of a payment on a Payment Channel Network
 * @typedef {Object} Payment
 * @property {string} amount      - Amount, in the smallest unit, of the payment
 * @property {string} address     - Payment Channel Network address of the node
 *                                  the payment is to.
 */

/**
 * The default amount of time, in seconds, that the Maker will use in forwarding this transaction.
 * LND's default value announced on its channels is 24 hours (144 Bitcoin blocks)
 *
 * @todo Make this amount dynamic and determined with the price/amount or determined from the channel graph
 * @type {Number}
 * @constant
 */
const DEFAULT_MAKER_FWD_DELTA = 86400

/**
 * The default amount of time, in seconds, that the Relayer will use in forwarding this transaction.
 * LND's default value announced on its channels is 24 hours (144 Bitcoin blocks)
 *
 * @todo Make this amount dynamic and published by the Relayer or determined from the channel graph
 * @type {Number}
 * @constant
 */
const DEFAULT_RELAYER_FWD_DELTA = 86400

/**
 * The default amoumt of time, in seconds, that the Taker (this node) expects to receive when settling a swap.
 * BOLT-11 states it as 90 minutes (9 Bitcoin blocks), but LND's default is 144 blocks to align to the forwarding
 * policy.
 *
 * @see {@link https://github.com/lightningnetwork/lightning-rfc/blob/master/11-payment-encoding.md}
 * @todo Make this amount dynamic and set by the broker/user
 * @type {Number}
 * @constant
 */
const DEFAULT_MIN_FINAL_DELTA = 86400

/**
 * The amount of time, in seconds, that we'd like to buffer any output timelock by to account for block ticks during a swap
 * This is especially problematic on regtest where we mine blocks every 10 seconds and is a known issue on mainnet.
 *
 * @see {@link https://github.com/lightningnetwork/lnd/issues/535}
 * @type {Number}
 * @constant
 */
const BLOCK_BUFFER = 1200

/**
 * Milliseconds between retries of cancels in cases where our timeout has
 * expired.
 * @type {number}
 */
const RETRY_CANCEL = 10000

/**
 * Translate a single swap between chains via an Interchain Bridge
 */
class InterchainBridge {
  /**
   * Watch for incoming payments on one chain, and translate them to another
   * chain, returning the resulting preimage back to the first chain.
   *
   * @param   {Object}  options
   * @param   {string}  options.hash            - Base64-encoded SHA256 hash of
   *                                              the preimage locking the
   *                                              payment.
   * @param   {Engine}  options.inboundEngine   - Engine for the incoming payment
   *                                              channel network
   * @param   {Engine}  options.outboundEngine  - Engine for the outgoing payment
   *                                              channel network
   * @param   {Payment} options.inboundPayment  - Inbound Payment we're expecting
   * @param   {Payment} options.outboundPayment - Outbound Payment to send
   * @param   {Date}    options.timeout         - Time after which the payment
   *                                              should not be translated. This
   *                                              is an absolute time.
   */
  constructor ({
    hash,
    inboundEngine,
    outboundEngine,
    inboundPayment,
    outboundPayment,
    timeout
  }) {
    logger.debug(`Setting up bridge for ${hash}`)

    this.hash = hash
    this.inboundEngine = inboundEngine
    this.outboundEngine = outboundEngine
    this.timeout = timeout

    const {
      amount: outboundAmount,
      address: outboundAddress
    } = outboundPayment
    this.outboundAmount = outboundAmount
    this.outboundAddress = outboundAddress

    const {
      amount: inboundAmount
    } = inboundPayment

    this.inboundAmount = inboundAmount

    // Our initial state is to assume that there could be a downstream
    // HTLC active, so we consider it unsafe to cancel upstream HTLC's
    // until we know for certain otherwise.
    this.safeToCancel = false

    // Set a timer to cancel our upstream HTLC if our timeout has expired
    // TODO: should we wait to set this until we have prepared?
    this.cancelOnTimeout()
  }

  /**
   * Cancel a swap when the timeout is expired and it is safe to do so.
   * @returns {void}
   */
  async cancelOnTimeout () {
    const {
      timeout,
      hash,
      inboundEngine,
      safeToCancel
    } = this

    const msToTimeout = new Date() - timeout

    if (safeToCancel && msToTimeout <= 0) {
      logger.error(`Timeout for ${hash} has expired, cancelling
        upstream invoice`)

      // `translate` should exit since `subscribeSwap` will
      // throw an exception once our invoice is cancelled
      await inboundEngine.cancelSwap(hash)
    } else {
      // reset our timer to try again
      logger.debug(`Retrying cancel for ${hash}, timer not expired, or it is` +
        'unsafe to cancel.')
      setTimeout(() => {
        this.cancelOnTimeout()
      }, Math.max(msToTimeout, RETRY_CANCEL))
    }
  }

  /**
   * The minimum time lock on inbound HTLCs for us
   * to accept them and be able to forward them on.
   * @returns {number} Time delta in seconds
   */
  get inboundTimeLock () {
    return this.minTimeLock + DEFAULT_MAKER_FWD_DELTA + BLOCK_BUFFER
  }

  /**
   * Calculate the minimum time lock on extended HTLCs
   * in order for them to be accepted.
   * @todo Make this value dynamic to accept different routes
   * and different forwarding policies / final cltv deltas
   * @returns {number} Time delta in seconds
   */
  get outboundTimeLock () {
    // This assumes a static route from this node, through the Relayer, to
    // the receiving node.
    return DEFAULT_RELAYER_FWD_DELTA + DEFAULT_MIN_FINAL_DELTA + BLOCK_BUFFER
  }

  /**
   * Prepare for a swap by setting up a hold invoice
   * on the inbound chain.
   */
  async prepare () {
    const {
      hash,
      inboundAmount,
      inboundEngine,
      inboundTimeLock,
      timeout
    } = this

    // TODO: update `prepareSwap` to take an expiration
    // time (absolute) and a minimum time lock in seconds
    // TODO: update `prepareSwap` to be idempotent
    await inboundEngine.prepareSwap(
      hash,
      inboundAmount,
      inboundTimeLock,
      timeout
    )
  }

  /**
   * Attempt to translate a swap between chains
   * @returns {string} Resolves on settlement of the inbound payment with the
   *                   preimage. Rejects if settlement fails at any point.
   */
  async translate () {
    const {
      hash,
      inboundEngine,
      outboundEngine,
      outboundAddress,
      outboundAmount,
      outboundTimeLock
    } = this

    // If we don't know the current state of the downstream HTLC, it is not
    // safe to cancel, even on a timeout.
    this.safeToCancel = false

    // We don't want to reject an incoming HTLC if we know that there is an active
    // outgoing one. If the outgoing HTLC is in flight or completed,
    // we should attempt to retrieve the associated preimage.
    logger.debug(`Checking outbound HTLC status for swap ${hash}`)
    if (await outboundEngine.isPaymentPendingOrComplete(hash)) {
      logger.debug(`Payment in progress for swap ${hash}, waiting for resolution`)

      return this.settle(outboundEngine.getPaymentPreimage(hash))
    }

    // While we are waiting for upstream HTLCs, it is safe for us to cancel
    // since we know we have nothing open downstream.
    this.safeToCancel = true

    // Subscribe to incoming payments that are accepted, but not yet settled.
    // Subscribing to a payment that is cancelled, doesn't exist, or is already
    // settled will result in an error.
    // Note that this will also error when we cancel the upstream invoice by
    // timeout.
    await inboundEngine.subscribeSwap(hash)

    logger.debug(`Sending payment to ${outboundAddress} to translate ${hash}`, {
      outboundTimeLock,
      outboundAmount
    })

    // TODO: fix `translateSwap` to take a max time lock
    return this.settle(outboundEngine.translateSwap(
      outboundAddress,
      hash,
      outboundAmount,
      // outboundTimeLock is the maximum time lock of the payment in seconds
      outboundTimeLock
    ))
  }

  /**
   * Settle a swap given a promise to retrieve a preimage
   * @param {Promise} preimagePromise - Resolves with the preimage or a
   *                                    permanent error.
   * @returns {Promise}                 Resolves with the preimage
   */
  async settle (preimagePromise) {
    const {
      hash,
      outboundAddress,
      outboundAmount
    } = this

    // If we are in the process of translating downstream, it is not safe
    // to cancel.
    this.safeToCancel = false

    let paymentPreimage
    let permanentError

    try {
      const translateSwapResponse = await preimagePromise
      paymentPreimage = translateSwapResponse.paymentPreimage
      permanentError = translateSwapResponse.permanentError
    } catch (e) {
      logger.error('Temporary Error encountered while translating swap: ' +
        e.message, { error: e.stack, hash })

      // A temporary error means we don't know the current state, so we need
      // to restart the whole process
      logger.debug(`Retrying swap translation for ${hash}`)
      return this.translate()
    }

    if (permanentError) {
      logger.error(permanentError)
      logger.error('Downstream payment encountered an error, cancelling ' +
        `upstream invoice for ${hash}`)
      await this.inboundEngine.cancelSwap(hash)
      throw new Error(permanentError)
    }

    logger.debug(`Successfully completed payment to ${outboundAddress} for ` +
      `swap ${hash}`, { outboundAmount })

    logger.debug(`Settling upstream payment for ${hash}`)
    await this.inboundEngine.settleSwap(paymentPreimage)

    return paymentPreimage
  }
}

module.exports = InterchainBridge
