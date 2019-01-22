async function payInvoice(engine, paymentRequest) {
    const [refundPaymentRequest] = await Promise.all([
        engine.createRefundInvoice(paymentRequest),
        engine.payInvoice(paymentRequest)
    ]);
    return refundPaymentRequest;
}
module.exports = payInvoice;
//# sourceMappingURL=pay-invoice.js.map