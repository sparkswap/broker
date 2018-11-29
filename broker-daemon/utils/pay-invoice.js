/**
 * Pay an invoice and create a refund payment request to have it paid back
 * @param  {Boolean} required       Whether this payment is required
 * @param  {String}  paymentRequest Payment Request that should be fulfilled and can be understood by the engine
 * @param  {Engine}  engine         Payment Channel Network engine to use to pay the invoice
 * @param  {Logger}  logger
 * @param  {String}  type           Type of invoice, either `fee` or `deposit`. Used for logging.
 * @param  {String}  publicId       Public ID of the object being paid for, either a `fillId` or `orderId`
 * @return {String}                 Payment request for a refund of the same amount that was paid
 */
async function payInvoice (engine, paymentRequest) {
  const [ refundPaymentRequest ] = await Promise.all([
    engine.createRefundInvoice(paymentRequest),
    engine.payInvoice(paymentRequest)
  ])

  return refundPaymentRequest
}

module.exports = payInvoice
