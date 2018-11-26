const { expect, sinon } = require('test/test-helper')

const payInvoice = require('./pay-invoice')

describe('payInvoice', () => {
  let required
  let paymentRequest
  let refundPaymentReqeust
  let engine
  let type
  let logger
  let publicId

  beforeEach(() => {
    required = true
    paymentRequest = 'fake:request'
    refundPaymentReqeust = 'fake:refund-request'
    engine = {
      createRefundInvoice: sinon.stub().resolves(refundPaymentReqeust),
      payInvoice: sinon.stub().resolves()
    }
    type = 'deposit'
    publicId = 'fakeId'
    logger = {
      debug: sinon.stub(),
      info: sinon.stub()
    }
  })

  it('noops for non-required invoices', async () => {
    required = false
    await payInvoice(required, paymentRequest, engine, logger, type, publicId)

    expect(engine.payInvoice).to.not.have.been.called()
  })

  it('throws an error if the payment request does not exist', () => {
    paymentRequest = null

    return expect(payInvoice(required, paymentRequest, engine, logger, type, publicId)).to.eventually.be.rejected()
  })

  it('pays the payment request', async () => {
    await payInvoice(required, paymentRequest, engine, logger, type, publicId)

    expect(engine.payInvoice).to.have.been.calledOnce()
    expect(engine.payInvoice).to.have.been.calledWith(paymentRequest)
  })

  it('creates a refund invoice', async () => {
    await payInvoice(required, paymentRequest, engine, logger, type, publicId)

    expect(engine.createRefundInvoice).to.have.been.calledOnce()
    expect(engine.createRefundInvoice).to.have.been.calledWith(paymentRequest)
  })

  it('returns the refund invoice', async () => {
    expect(await payInvoice(required, paymentRequest, engine, logger, type, publicId)).to.be.eql(refundPaymentReqeust)
  })
})
