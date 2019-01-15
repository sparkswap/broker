const path = require('path')
const { expect, rewire, sinon } = require('test/test-helper')

const getPreimage = rewire(path.resolve(__dirname, 'get-preimage'))

describe('getPreimage', () => {
  let params
  let getRecords
  let Order
  let ordersByHash
  let send
  let fromStorageBound
  let order
  let engines
  let preimage
  let translateSwap
  let isPaymentPendingOrComplete
  let getPaymentPreimage

  beforeEach(() => {
    order = {
      inboundSymbol: 'BTC',
      inboundFillAmount: '1000000',
      swapHash: 'as09fdjasdf09ja0dsf==',
      outboundSymbol: 'LTC',
      outboundFillAmount: '10000000',
      takerAddress: 'bolt:9128734923874'
    }

    preimage = 'as9fja9s8fh98qahwef9phs=='

    getRecords = sinon.stub().resolves([ order ])
    fromStorageBound = getPreimage.__get__('fromStorage')

    getPreimage.__set__('getRecords', getRecords)
    getPreimage.__set__('Order', Order)

    ordersByHash = {
      range: sinon.stub()
    }
    params = {
      paymentHash: 'as09fdjasdf09ja0dsf==',
      amount: '1000000',
      symbol: 'BTC',
      timeLock: '10000',
      bestHeight: '9000'
    }
    translateSwap = sinon.stub()
    translateSwap.resolves({
      paymentPreimage: preimage
    })
    send = sinon.stub()
    engines = new Map()
    isPaymentPendingOrComplete = sinon.stub().resolves(false)
    getPaymentPreimage = sinon.stub().resolves({})
    engines.set('LTC', {
      translateSwap,
      isPaymentPendingOrComplete,
      getPaymentPreimage
    })
    engines.set('BTC', {
      secondsPerBlock: 600
    })
  })

  it('gets the records for the hash', async () => {
    const fakeRange = 'myrange'
    ordersByHash.range.returns(fakeRange)
    await getPreimage({ params, send, ordersByHash, engines })

    expect(ordersByHash.range).to.have.been.calledOnce()
    expect(ordersByHash.range).to.have.been.calledWith({
      gte: params.paymentHash,
      lte: params.paymentHash
    })
    expect(getRecords).to.have.been.calledOnce()
    expect(getRecords).to.have.been.calledWith(ordersByHash)
    expect(getRecords).to.have.been.calledWith(sinon.match.any, fromStorageBound)
    expect(getRecords).to.have.been.calledWith(sinon.match.any, sinon.match.any, fakeRange)
  })

  it('returns permanent error if too many orders match the hash', async () => {
    getRecords.resolves([ order, order ])

    await getPreimage({ params, send, ordersByHash, engines })

    expect(send).to.have.been.calledOnce()
    expect(send).to.have.been.calledWith(sinon.match({ permanentError: sinon.match('Too many routing entries') }))
  })

  it('returns permanent error if no orders match the hash', async () => {
    getRecords.resolves([ ])
    await getPreimage({ params, send, ordersByHash, engines })

    expect(send).to.have.been.calledOnce()
    expect(send).to.have.been.calledWith(sinon.match({ permanentError: sinon.match('No routing entry available') }))
  })

  it('checks if the payment has been started or completed', async () => {
    await getPreimage({ params, send, ordersByHash, engines })

    expect(isPaymentPendingOrComplete).to.have.been.calledWith(params.paymentHash)
  })

  context('the payment is pending or complete', async () => {
    beforeEach(() => {
      isPaymentPendingOrComplete.resolves(true)
    })
    it('attempts to get the payment preimage from the engine', async () => {
      await getPreimage({ params, send, ordersByHash, engines })

      expect(getPaymentPreimage).to.have.been.calledOnce()
      expect(getPaymentPreimage).to.have.been.calledWith(params.paymentHash)
    })

    it('returns a permanent error if the getting the payment preimage results in an permanent error', async () => {
      getPaymentPreimage.resolves({permanentError: 'error'})
      await getPreimage({ params, send, ordersByHash, engines })

      expect(send).to.have.been.calledOnce()
      expect(send).to.have.been.calledWith(sinon.match({ permanentError: sinon.match('error') }))
    })

    it('returns the payment preimage if the getting the payment preimage from the engine is successful', async () => {
      getPaymentPreimage.resolves({paymentPreimage: 'asdfasdf'})
      await getPreimage({ params, send, ordersByHash, engines })

      expect(send).to.have.been.calledOnce()
      expect(send).to.have.been.calledWith(sinon.match({ paymentPreimage: 'asdfasdf' }))
    })
  })

  context('the payment is not pending or complete', async () => {
    it('will not look up the payment preimage', async () => {
      await getPreimage({ params, send, ordersByHash, engines })

      expect(getPaymentPreimage).to.not.have.been.called()
    })
  })

  it('returns permanent error if the amount is not at least as much as on the order', async () => {
    params.amount = '10'

    await getPreimage({ params, send, ordersByHash, engines })

    expect(send).to.have.been.calledOnce()
    expect(send).to.have.been.calledWith(sinon.match({ permanentError: sinon.match('Insufficient currency') }))
  })

  it('returns permanent error if the amount is not at least as much as on the order', async () => {
    params.amount = '10'

    await getPreimage({ params, send, ordersByHash, engines })

    expect(send).to.have.been.calledOnce()
    expect(send).to.have.been.calledWith(sinon.match({ permanentError: sinon.match('Insufficient currency') }))
  })

  it('returns permanent error if the symbol does not match the inbound symbol on the order', async () => {
    order.inboundSymbol = 'LTC'

    await getPreimage({ params, send, ordersByHash, engines })

    expect(send).to.have.been.calledOnce()
    expect(send).to.have.been.calledWith(sinon.match({ permanentError: sinon.match('Wrong currency') }))
  })

  it('returns permanent error if the current block height is too high for the time lock', async () => {
    params.bestHeight = '10000'

    await getPreimage({ params, send, ordersByHash, engines })

    expect(send).to.have.been.calledOnce()
    expect(send).to.have.been.calledWith(sinon.match({ permanentError: sinon.match('is higher than') }))
  })

  it('makes a payment to the outbound engine', async () => {
    await getPreimage(({ params, send, ordersByHash, engines }))

    expect(engines.get('LTC').translateSwap).to.have.been.calledOnce()
    expect(engines.get('LTC').translateSwap).to.have.been.calledWith(order.takerAddress, params.paymentHash, order.outboundFillAmount, '600000')
  })

  it('returns permanentError if the outbound engine returns one', async () => {
    translateSwap.resolves({ permanentError: 'fake error' })

    await getPreimage({ params, send, ordersByHash, engines })

    expect(send).to.have.been.calledOnce()
    expect(send).to.have.been.calledWith(sinon.match({ permanentError: 'fake error' }))
  })

  it('returns the preimage to the requesting client', async () => {
    await getPreimage(({ params, send, ordersByHash, engines }))

    expect(send).to.have.been.calledOnce()
    expect(send).to.have.been.calledWith({ paymentPreimage: preimage })
  })
})
