async function payInvoice (required, paymentRequest, engine, logger, type, publicId) {
  if (!required) {
    logger.debug(`Skipping payment for ${type} on ${publicId}, not required`)
    return
  }

  if (!paymentRequest) throw new Error(`Cant pay ${type} invoice because ${type} invoice does not exist`)

  logger.debug(`Attempting to pay ${type} for: ${publicId}`)

  const [ refundPaymentRequest ] = await Promise.all([
    engine.createRefundInvoice(paymentRequest),
    engine.payInvoice(paymentRequest)
  ])

  logger.debug(`Response from engine for ${type}`, {
    refundPaymentRequest
  })

  logger.info(`Paid ${type} for ${publicId}`)

  return refundPaymentRequest
}

module.exports = payInvoice
