const { logger } = require('../utils')

/**
 * A description of a payment on a Payment Channel Network
 * @typedef {Object} Payment
 * @property {string} symbol      - Symbol of the chain of the payment
 * @property {string} amount      - Amount, in the smallest unit, of the payment
 * @property {string} maxTimeLock - Maximum time lock, in seconds, of the
 *                                  payment
 * @property {string} address     - Payment Channel Network address of the node
 *                                  the payment is to.
 */

/**
 * Bridge for translating payments and preimages from
 * one chain / payment channel network to another.
 */
class InterchainBridge {
  constructor ({ engines }) {
    this.engines = engines
  }

  /**
   * Watch for incoming payments on one chain, and translate them to another
   * chain, returning the resulting preimage back to the first chain.
   *
   * @param   {Object}  options
   * @param   {string}  options.hash            - Base64-encoded SHA256 hash of
   *                                              the preimage locking the
   *                                              payment.
   * @param   {string}  options.inboundSymbol   - Symbol of the chain from which
   *                                              we expect payment. This should
   *                                              already have been prepared.
   * @param   {Payment} options.outboundPayment - Outbound Payment to send
   * @param   {Date}    options.timeout         - Time after which the payment
   *                                              should not be translated.
   * @param   {string} options.maxTimeLock      - Maximum lock time for the outbound
   * @returns {void}                              Resolves on settlement of the
   *                                              inbound payment with the
   *                                              preimage. Rejects if
   *                                              settlement fails at any point.
   */
  async translate ({ hash, inboundSymbol, outboundPayment, timeout }) {
    logger.debug(`Setting up translator for ${hash}`)

    const bridge = this
    const {
      symbol: outboundSymbol,
      amount: outboundAmount,
      address: outboundAddress,
      maxTimeLock
    } = outboundPayment

    const outboundEngine = this.engines.get(outboundSymbol)
    if (!outboundEngine) {
      throw new Error(`No engine available for ${outboundSymbol} when` +
        `translating ${hash}.`)
    }

    const inboundEngine = this.engines.get(inboundSymbol)
    if (!inboundEngine) {
      throw new Error(`No engine available for ${inboundSymbol} when` +
        `translating ${hash}.`)
    }

    /**
     * Settle a swap given a promise to retrieve a preimage
     * @param {Promise} preimagePromise - Resolves with the preimage or a
     *                                    permanent error.
     * @param {number}  cancelTimerId   - Timer ID for the cancellation timeout
     * @returns {Promise}                 Resolves with the preimage
     */
    async function settle (preimagePromise, cancelTimerId) {
      let paymentPreimage
      let permanentError

      try {
        const translateSwapResponse = await outboundEngine.translateSwap(
          outboundAddress,
          hash,
          outboundAmount,
          maxTimeLock
        )
        paymentPreimage = translateSwapResponse.paymentPreimage
        permanentError = translateSwapResponse.permanentError
      } catch (e) {
        logger.error('Temporary Error encountered while translating swap: ' +
          e.message, { error: e.stack, hash })

        // A temporary error means we don't know the current state, so we need
        // to restart the whole process

        if (cancelTimerId) {
          clearTimeout(cancelTimerId)
        }

        logger.debug(`Retrying swap translation for ${hash}`)
        return bridge.translate({
          hash,
          inboundSymbol,
          outboundPayment,
          timeout,
          maxTimeLock
        })
      }

      if (permanentError) {
        logger.error(permanentError)
        logger.error('Downstream payment encountered an error, cancelling ' +
          `upstream invoice for ${hash}`)
        await inboundEngine.cancelSwap(hash)
        throw new Error(permanentError)
      }

      logger.debug(`Successfully completed payment to ${outboundAddress} for ` +
        `swap ${hash}`)

      logger.debug(`Settling upstream payment for ${hash}`)
      await inboundEngine.settleSwap(paymentPreimage)

      return paymentPreimage
    }

    // We don't want to reject an incoming HTLC if we know that there is an active outgoing one. If the outgoing HTLC is in flight or completed,
    // we should attempt to retrieve the associated preimage.
    logger.debug(`Checking outbound HTLC status for swap ${hash}`, { outboundSymbol })
    if (await outboundEngine.isPaymentPendingOrComplete(hash)) {
      logger.debug(`Payment in progress for swap ${hash}, waiting for resolution`)

      return settle(outboundEngine.getPaymentPreimage(hash))
    }

    // Wait for expirations and cancel the upstream invoice unless we're already
    // settling.
    let currentlySettling = false

    if (!timeout < new Date()) {
      logger.error(`Timeout for ${hash} has already expired, cancelling
        upstream invoice`)
      await inboundEngine.cancelSwap(hash)
      throw new Error(`Timeout for ${hash} has already expired.`)
    }

    const cancelTimerId = setTimeout(async () => {
      if (!currentlySettling) {
        logger.error(`Timeout for ${hash} has expired, cancelling
          upstream invoice`)
        await inboundEngine.cancelSwap(hash)

        // The outer function should exit since `subscribeSwap` will
        // throw an exception once our invoice is cancelled
      }
    }, timeout - new Date())

    // Subscribe to incoming payments that are accepted, but not yet settled.
    // Subscribing to a payment that is cancelled, doesn't exist, or is already
    // settled will result in an error.
    // Note that this will also error when we cancel the upstream invoice by
    // timeout.
    await inboundEngine.subscribeSwap(hash)

    currentlySettling = true

    logger.debug(`Sending payment to ${outboundAddress} to translate ${hash}`, {
      maxTimeLock,
      outboundAmount
    })

    return settle(
      outboundEngine.translateSwap(
        outboundAddress,
        hash,
        outboundAmount,
        maxTimeLock
      ),
      cancelTimerId
    )
  }
}

module.exports = InterchainBridge
