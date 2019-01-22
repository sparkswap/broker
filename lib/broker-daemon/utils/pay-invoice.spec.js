const { expect, sinon } = require('test/test-helper');
const payInvoice = require('./pay-invoice');
describe('payInvoice', () => {
    let paymentRequest;
    let refundPaymentReqeust;
    let engine;
    beforeEach(() => {
        paymentRequest = 'fake:request';
        refundPaymentReqeust = 'fake:refund-request';
        engine = {
            createRefundInvoice: sinon.stub().resolves(refundPaymentReqeust),
            payInvoice: sinon.stub().resolves()
        };
    });
    it('pays the payment request', async () => {
        await payInvoice(engine, paymentRequest);
        expect(engine.payInvoice).to.have.been.calledOnce();
        expect(engine.payInvoice).to.have.been.calledWith(paymentRequest);
    });
    it('creates a refund invoice', async () => {
        await payInvoice(engine, paymentRequest);
        expect(engine.createRefundInvoice).to.have.been.calledOnce();
        expect(engine.createRefundInvoice).to.have.been.calledWith(paymentRequest);
    });
    it('returns the refund invoice', async () => {
        expect(await payInvoice(engine, paymentRequest)).to.be.eql(refundPaymentReqeust);
    });
});
//# sourceMappingURL=pay-invoice.spec.js.map