const path = require('path')
const {
  expect,
  rewire,
  sinon
} = require('test/test-helper')

const interchain = rewire(path.resolve(__dirname, 'interchain'))

describe('interchain', () => {
  let logger
  let delay

  beforeEach(() => {
    logger = {
      debug: sinon.stub(),
      info: sinon.stub(),
      error: sinon.stub()
    }

    delay = sinon.stub().resolves()

    interchain.__set__('logger', logger)
    interchain.__set__('delay', delay)
  })

  describe('#prepareSwap', () => {
    let hash
    let inboundEngine
    let inboundAmount
    let timeout
    let prepareSwapStub

    beforeEach(() => {
      prepareSwapStub = sinon.stub().resolves()

      hash = 'aofjoaisjdf=='
      inboundEngine = {
        prepareSwap: prepareSwapStub
      }
      timeout = new Date()
    })

    it('prepares a swap on the inbound engine', async () => {
      await interchain.prepareSwap(
        hash,
        { engine: inboundEngine, amount: inboundAmount },
        timeout
      )

      expect(prepareSwapStub).to.have.been.calledOnce()
      expect(prepareSwapStub).to.have.been.calledWith(
        hash,
        inboundAmount,
        261600,
        timeout
      )
    })
  })

  describe('#forwardSwap', () => {
    let hash
    let preimage
    let inboundEngine
    let outboundEngine
    let outboundAmount
    let outboundAddress
    let inboundPayment
    let outboundPayment
    let cancelSwap
    let settleSwap
    let isPaymentPendingOrComplete
    let getPaymentPreimage
    let waitForSwapCommitment
    let getSettledSwapPreimage
    let translateSwap

    beforeEach(() => {
      hash = 'aofjoaisjdf=='
      preimage = '1267800=='

      outboundAmount = '10000'
      outboundAddress = 'aoijsfdoajdf89'

      isPaymentPendingOrComplete = sinon.stub().resolves(false)
      getPaymentPreimage = sinon.stub().resolves(preimage)
      translateSwap = sinon.stub().resolves(preimage)

      outboundEngine = {
        isPaymentPendingOrComplete,
        getPaymentPreimage,
        translateSwap
      }

      cancelSwap = sinon.stub().resolves()
      settleSwap = sinon.stub().resolves()
      waitForSwapCommitment = sinon.stub().resolves(new Date('2019-06-27T01:10:36.000Z'))
      getSettledSwapPreimage = sinon.stub().resolves(preimage)

      inboundEngine = {
        cancelSwap,
        settleSwap,
        waitForSwapCommitment,
        getSettledSwapPreimage
      }

      inboundPayment = { engine: inboundEngine }
      outboundPayment = {
        engine: outboundEngine,
        address: outboundAddress,
        amount: outboundAmount
      }
    })

    it('translates the payment downstream', async () => {
      await interchain.forwardSwap(hash, inboundPayment, outboundPayment)

      expect(translateSwap).to.have.been.calledWith(
        outboundAddress,
        hash,
        outboundAmount
      )
      expect(translateSwap.args[0][3].toISOString()).to.be.eql('2019-06-29T01:30:36.000Z')
    })

    it('settles the upstream payment', async () => {
      const res = await interchain.forwardSwap(hash, inboundPayment, outboundPayment)

      expect(settleSwap).to.have.been.calledWith(preimage)
      expect(res).to.be.eql(preimage)
    })

    context('payment is in progress', () => {
      beforeEach(() => {
        isPaymentPendingOrComplete.resolves(true)
      })

      it('settles the upstream payment', async () => {
        const res = await interchain.forwardSwap(hash, inboundPayment, outboundPayment)

        expect(settleSwap).to.have.been.calledWith(preimage)
        expect(res).to.be.eql(preimage)
      })

      it('retries on error', async () => {
        getPaymentPreimage.onCall(0).rejects(new Error('fake error'))
        getPaymentPreimage.onCall(1).resolves(preimage)

        const res = await interchain.forwardSwap(hash, inboundPayment, outboundPayment)

        expect(settleSwap).to.have.been.calledWith(preimage)
        expect(res).to.be.eql(preimage)
      })
    })

    context('swap is settled', () => {
      beforeEach(() => {
        let SettledSwapError = interchain.__get__('ENGINE_ERRORS').SettledSwapError
        const settledError = new SettledSwapError('Invoice is already settled')
        waitForSwapCommitment.rejects(settledError)
      })

      it('settles the upstream payment', async () => {
        const res = await interchain.forwardSwap(hash, inboundPayment, outboundPayment)

        expect(settleSwap).to.have.been.calledWith(preimage)
        expect(res).to.be.eql(preimage)
      })

      it('retries on error', async () => {
        getPaymentPreimage.onCall(0).rejects(new Error('fake error'))
        getPaymentPreimage.onCall(1).resolves(preimage)

        const res = await interchain.forwardSwap(hash, inboundPayment, outboundPayment)

        expect(settleSwap).to.have.been.calledWith(preimage)
        expect(res).to.be.eql(preimage)
      })
    })

    context('error while waiting for swap commitment', () => {
      beforeEach(() => {
        waitForSwapCommitment.onCall(0).rejects(new Error('fake error'))
        waitForSwapCommitment.onCall(1).resolves()
      })

      it('settles the upstream payment', async () => {
        const res = await interchain.forwardSwap(hash, inboundPayment, outboundPayment)

        expect(settleSwap).to.have.been.calledWith(preimage)
        expect(res).to.be.eql(preimage)
      })
    })

    context('permanent error while sending payment', () => {
      let PermanentSwapError

      beforeEach(() => {
        PermanentSwapError = interchain.__get__('ENGINE_ERRORS').PermanentSwapError
        translateSwap.rejects(new PermanentSwapError('permanent error while translating'))
      })

      it('cancels the upstream payment', async () => {
        try {
          await interchain.forwardSwap(hash, inboundPayment, outboundPayment)
        } catch (e) {
          expect(cancelSwap).to.have.been.calledWith(hash)
        }
      })

      it('throws an error', () => {
        return expect(
          interchain.forwardSwap(hash, inboundPayment, outboundPayment)
        ).to.eventually.be.rejectedWith('permanent error while translating')
      })
    })

    context('exception while sending payment', () => {
      beforeEach(() => {
        translateSwap.onCall(0).rejects(new Error('fake error'))
        translateSwap.onCall(1).resolves(preimage)
      })

      it('settles the upstream payment', async () => {
        const res = await interchain.forwardSwap(hash, inboundPayment, outboundPayment)

        expect(settleSwap).to.have.been.calledWith(preimage)
        expect(res).to.be.eql(preimage)
      })

      it('delays before settling', async () => {
        await interchain.forwardSwap(hash, inboundPayment, outboundPayment)

        expect(delay).to.have.been.calledOnce()
      })
    })
  })
})
