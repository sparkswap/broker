/**
 * Pay an invoice and create a refund payment request to have it paid back
 * @param  {Engine}  engine         - Payment Channel Network engine to use to pay the invoice
 * @param  {string}  paymentRequest - Payment Request that should be fulfilled and can be understood by the engine
 * @returns {string}                 Payment request for a refund of the same amount that was paid
 */
async function payInvoice (engine, paymentRequest) {
  const [ refundPaymentRequest ] = await Promise.all([
    engine.createRefundInvoice(paymentRequest),
    engine.payInvoice(paymentRequest)
  ])

  return refundPaymentRequest
}

module.exports = payInvoice
