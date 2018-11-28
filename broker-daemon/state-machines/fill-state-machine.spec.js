const path = require('path')
const { expect, rewire, sinon, delay } = require('test/test-helper')

const FillStateMachine = rewire(path.resolve(__dirname, 'fill-state-machine'))

describe('FillStateMachine', () => {
  let Fill

  let store
  let logger
  let relayer
  let engines

  beforeEach(() => {
    Fill = sinon.stub()
    FillStateMachine.__set__('Fill', Fill)

    store = {
      sublevel: sinon.stub(),
      put: sinon.stub().callsArgAsync(2)
    }
    logger = {
      info: sinon.stub(),
      error: sinon.stub(),
      debug: sinon.stub()
    }
    relayer = {
      takerService: {
        createFill: sinon.stub().resolves()
      },
      identity: {
        authorize: sinon.stub()
      }
    }
    engines = new Map()
    engines.set('BTC', {
      createSwapHash: sinon.stub().resolves(),
      getPaymentChannelNetworkAddress: sinon.stub().resolves('bolt:asdfasdf')
    })
    engines.set('LTC', {
      createSwapHash: sinon.stub().resolves(),
      getPaymentChannelNetworkAddress: sinon.stub().resolves('bolt:asdfasdf')
    })
  })

  describe('new', () => {
    it('exposes the store', () => {
      const fsm = new FillStateMachine({ store, logger, relayer, engines })

      expect(fsm).to.have.property('store', store)
    })

    it('exposes the logger', () => {
      const fsm = new FillStateMachine({ store, logger, relayer, engines })

      expect(fsm).to.have.property('logger', logger)
    })

    it('exposes the relayer', () => {
      const fsm = new FillStateMachine({ store, logger, relayer, engines })

      expect(fsm).to.have.property('relayer', relayer)
    })

    it('exposes the engines', () => {
      const fsm = new FillStateMachine({ store, logger, relayer, engines })

      expect(fsm).to.have.property('engines', engines)
    })

    it('does not save a copy in the store', () => {
      new FillStateMachine({ store, logger, relayer, engines }) // eslint-disable-line
      return expect(store.put).to.not.have.been.called
    })
  })

  describe('#tryTo', () => {
    let fsm

    beforeEach(() => {
      fsm = new FillStateMachine({ store, logger, relayer, engines })
      fsm.goto('created')
    })

    it('moves to rejected if using an invalid transition', async () => {
      fsm.reject = sinon.stub()

      fsm.tryTo('blergh')

      await delay(10)

      expect(fsm.reject).to.have.been.calledOnce()
    })
  })

  describe('#persist', () => {
    let fsm
    let key

    beforeEach(() => {
      fsm = new FillStateMachine({ store, logger, relayer, engines })
      fsm.fill = {
        valueObject: { my: 'fill' }
      }
      key = 'fakeKey'
    })

    it('throws if no key is available', () => {
      return expect(fsm.persist()).to.eventually.be.rejectedWith(Error)
    })

    it('stringifies values', async () => {
      await fsm.persist(key)

      expect(store.put).to.have.been.calledOnce()
      expect(store.put).to.have.been.calledWith(sinon.match.any, sinon.match.string)
    })

    it('uses the key to save values', async () => {
      await fsm.persist(key)

      expect(store.put).to.have.been.calledOnce()
      expect(store.put).to.have.been.calledWith(key)
    })

    it('saves state machine data in the database', async () => {
      await fsm.persist(key)

      expect(store.put).to.have.been.calledWith(sinon.match.any, sinon.match('{"state":"none","fill":{"my":"fill"},"history":[]}'))
    })

    it('saves the fill to the database', async () => {
      await fsm.persist(key)

      expect(store.put).to.have.been.calledWith(sinon.match.any, sinon.match('"my":"fill"'))
    })

    it('saves the state in the database', async () => {
      await fsm.persist(key)

      expect(store.put).to.have.been.calledWith(sinon.match.any, sinon.match('"state":"none"'))
    })

    it('saves history in the database', async () => {
      await fsm.goto('created')
      await fsm.persist(key)

      expect(store.put).to.have.been.calledWith(sinon.match.any, sinon.match('"history":["created"]'))
    })

    it('saves error in the database', async () => {
      fsm.error = new Error('fakeError')
      await fsm.persist(key)

      expect(store.put).to.have.been.calledWith(sinon.match.any, sinon.match('"error":"fakeError"'))
    })
  })

  describe('#goto', () => {
    let fsm

    beforeEach(() => {
      fsm = new FillStateMachine({ store, logger, relayer, engines })
    })

    it('moves the state to the given state', async () => {
      await fsm.goto('created')

      expect(fsm.state).to.be.equal('created')
    })

    it('does not save a copy in the store', async () => {
      await fsm.goto('created')

      return expect(store.put).to.not.have.been.called
    })
  })

  describe('#create', () => {
    let fsm
    let blockOrderId
    let orderParams
    let fillParams
    let setCreatedParams
    let fakeKey
    let fakeValueObject
    let createFillResponse

    beforeEach(() => {
      fakeKey = 'mykey'
      fakeValueObject = {
        my: 'object'
      }
      createFillResponse = {
        fillId: 'fakeFillId',
        feePaymentRequest: 'lnbcas9df0as9fu',
        depositPaymentRequest: 'lnbcasd9fuas90f'
      }
      Fill.prototype.key = fakeKey
      Fill.prototype.valueObject = fakeValueObject
      setCreatedParams = sinon.stub()
      Fill.prototype.setCreatedParams = setCreatedParams
      Fill.prototype.setSwapHash = sinon.stub()
      relayer.takerService.createFill.resolves(createFillResponse)
      fsm = new FillStateMachine({ store, logger, relayer, engines })
      blockOrderId = 'blockid'
      orderParams = {
        orderId: 'faklsadfjo',
        side: 'BID',
        baseSymbol: 'BTC',
        counterSymbol: 'LTC',
        baseAmount: '100000',
        counterAmount: '1000'
      }
      fillParams = {
        fillAmount: '90000'
      }

      Fill.prototype.order = orderParams
      Fill.prototype.inboundAmount = '900'
      Fill.prototype.inboundSymbol = 'LTC'
    })

    it('creates a fill model', async () => {
      await fsm.create(blockOrderId, orderParams, fillParams)

      expect(Fill).to.have.been.calledOnce()
      expect(Fill).to.have.been.calledWithNew()
      expect(fsm).to.have.property('fill')
      expect(fsm.fill).to.be.instanceOf(Fill)
    })

    it('passes the params to the fill model', async () => {
      await fsm.create(blockOrderId, orderParams, fillParams)

      expect(Fill).to.have.been.calledWith(blockOrderId, sinon.match(orderParams), sinon.match(fillParams))
    })

    it('creates a swap hash for the fill', async () => {
      const fakeHash = Buffer.from('fakeHash')
      engines.get('LTC').createSwapHash.resolves(fakeHash)

      await fsm.create(blockOrderId, orderParams, fillParams)

      expect(engines.get('LTC').createSwapHash).to.have.been.calledOnce()
      expect(engines.get('LTC').createSwapHash).to.have.been.calledWith(orderParams.orderId, '900')
      expect(fsm.fill.setSwapHash).to.have.been.calledOnce()
      expect(fsm.fill.setSwapHash).to.have.been.calledWith(fakeHash)
    })

    it('creates a fill on the relayer', async () => {
      const fakeParams = {
        my: 'fake'
      }
      Fill.prototype.paramsForCreate = fakeParams

      await fsm.create(blockOrderId, orderParams, fillParams)

      expect(relayer.takerService.createFill).to.have.been.calledOnce()
      expect(relayer.takerService.createFill).to.have.been.calledWith(fakeParams)
    })

    it('updates the fill with returned params', async () => {
      await fsm.create(blockOrderId, orderParams, fillParams)

      expect(setCreatedParams).to.have.been.calledOnce()
      expect(setCreatedParams).to.have.been.calledWith(sinon.match(createFillResponse))
    })

    it('throws an error if the relayer returns a fill error', () => {
      const fillError = {
        fillError: {
          code: 'ORDER_NOT_PLACED',
          message: 'Order is not in a state to be filled'
        }
      }
      relayer.takerService.createFill.resolves(fillError)

      expect(fsm.create(blockOrderId, orderParams, fillParams)).to.eventually.be.rejectedWith('ORDER_NOT_PLACED')
    })

    it('saves a copy in the store', async () => {
      await fsm.create(blockOrderId, orderParams, fillParams)

      expect(store.put).to.have.been.calledOnce()
      expect(store.put).to.have.been.calledWith(fakeKey, sinon.match('"my":"object"'))
    })

    it('saves the current state in the store', async () => {
      await fsm.create(blockOrderId, orderParams, fillParams)

      expect(store.put).to.have.been.calledOnce()
      expect(store.put).to.have.been.calledWith(fakeKey, sinon.match('"state":"created"'))
    })

    it('throws an error in creation on the relayer fails', () => {
      relayer.takerService.createFill.rejects(new Error('fake error'))

      return expect(fsm.create(blockOrderId, orderParams, fillParams)).to.be.rejectedWith(Error)
    })

    it('cancels the transition if the creation on the relayer fails', async () => {
      relayer.takerService.createFill.rejects()

      try {
        await fsm.create(blockOrderId, orderParams, fillParams)
      } catch (e) {
        expect(fsm.state).to.be.equal('none')
      }
    })

    it('does not save a copy if creation on the relayer fails', async () => {
      relayer.takerService.createFill.rejects()

      try {
        await fsm.create(blockOrderId, orderParams, fillParams)
      } catch (e) {
        return expect(store.put).to.not.have.been.called
      }
    })

    it('automatically attempts to fill the order after fill creation', async () => {
      fsm.tryTo = sinon.stub()
      await fsm.create(blockOrderId, orderParams, fillParams)

      await delay(10)
      expect(fsm.tryTo).to.have.been.calledOnce()
      expect(fsm.tryTo).to.have.been.calledWith('fillOrder')
    })
  })

  describe('#fillOrder', () => {
    let fakeFill
    let fsm
    let payInvoiceStub
    let createRefundInvoiceStub
    let fillOrderStub
    let subscribeExecuteStub
    let subscribeExecuteStream
    let invoice
    let feePaymentRequest
    let depositPaymentRequest
    let fillId
    let outboundSymbol

    beforeEach(async () => {
      invoice = '1234'
      payInvoiceStub = sinon.stub()
      createRefundInvoiceStub = sinon.stub().returns(invoice)
      fillOrderStub = sinon.stub().resolves({})
      subscribeExecuteStream = {
        on: sinon.stub(),
        removeListener: sinon.stub()
      }
      subscribeExecuteStub = sinon.stub().returns(subscribeExecuteStream)
      feePaymentRequest = 'fee'
      depositPaymentRequest = 'deposit'
      fillId = '1234'
      outboundSymbol = 'BTC'

      fakeFill = { feePaymentRequest, depositPaymentRequest, fillId, outboundSymbol }
      engines.set('BTC', { payInvoice: payInvoiceStub, createRefundInvoice: createRefundInvoiceStub })
      relayer = {
        takerService: {
          fillOrder: fillOrderStub,
          subscribeExecute: subscribeExecuteStub
        },
        identity: {
          authorize: sinon.stub()
        }
      }

      fsm = new FillStateMachine({ store, logger, relayer, engines })
      fsm.fill = fakeFill

      await fsm.goto('created')
    })

    it('pays a fee invoice', async () => {
      await fsm.fillOrder()
      expect(payInvoiceStub).to.have.been.calledWith(feePaymentRequest)
    })

    it('pays a deposit invoice', async () => {
      await fsm.fillOrder()
      expect(payInvoiceStub).to.have.been.calledWith(depositPaymentRequest)
    })

    it('creates a fee refund invoice', async () => {
      await fsm.fillOrder()
      expect(createRefundInvoiceStub).to.have.been.calledWith(feePaymentRequest)
    })

    it('creates a deposit refund invoice', async () => {
      await fsm.fillOrder()
      expect(createRefundInvoiceStub).to.have.been.calledWith(depositPaymentRequest)
    })

    it('authorizes the request', async () => {
      await fsm.fillOrder()

      expect(relayer.identity.authorize).to.have.been.calledWith(fillId)
    })

    it('fills an order on the relayer', async () => {
      const fakeAuth = 'fake auth'
      relayer.identity.authorize.returns(fakeAuth)

      await fsm.fillOrder()
      expect(fillOrderStub).to.have.been.calledWith({
        feeRefundPaymentRequest: invoice,
        depositRefundPaymentRequest: invoice,
        fillId,
        authorization: fakeAuth
      })
    })

    it('rejects if the relayer returns a fill error', () => {
      const fillError = {
        fillError: {
          code: 'ORDER_NOT_PLACED',
          message: 'Order is not in a state to be filled'
        }
      }
      relayer.takerService.fillOrder.resolves(fillError)

      expect(fsm.fillOrder()).to.eventually.be.rejectedWith('ORDER_NOT_PLACED')
    })

    it('errors if a feePaymentRequest isnt available on the fill', () => {
      fsm.fill = {}
      return expect(fsm.fillOrder()).to.eventually.be.rejectedWith('Cant pay invoices because fee')
    })

    it('errors if a feePaymentRequest isnt available on the fill', () => {
      fsm.fill = { feePaymentRequest }
      return expect(fsm.fillOrder()).to.eventually.be.rejectedWith('Cant pay invoices because deposit')
    })

    it('does not subscribe to executions for fills that fail', async () => {
      fillOrderStub.rejects(new Error('fake error'))

      expect(subscribeExecuteStub).to.not.have.been.called()
    })

    it('authorizes the request', async () => {
      await fsm.fillOrder()
      expect(relayer.identity.authorize).to.have.been.calledTwice()
      expect(relayer.identity.authorize).to.have.been.calledWith(fillId)
    })

    it('subscribes to fills on the relayer', async () => {
      const fakeAuth = 'my auth'
      relayer.identity.authorize.onCall(1).returns(fakeAuth)

      await fsm.fillOrder()
      expect(subscribeExecuteStub).to.have.been.calledOnce()
      expect(subscribeExecuteStub).to.have.been.calledWith(sinon.match({ fillId, authorization: fakeAuth }))
    })

    it('rejects on error from the relayer subscribe fill hook', async () => {
      fsm.reject = sinon.stub()
      subscribeExecuteStream.on.withArgs('error').callsArgWithAsync(1, new Error('fake error'))

      await fsm.fillOrder()

      await delay(10)

      expect(fsm.reject).to.have.been.calledOnce()
      expect(fsm.reject.args[0][0]).to.be.instanceOf(Error)
      expect(fsm.reject.args[0][0]).to.have.property('message', 'fake error')
    })

    it('rejects when the relayer stream closes early', async () => {
      fsm.reject = sinon.stub()
      subscribeExecuteStream.on.withArgs('end').callsArgAsync(1)

      await fsm.fillOrder()

      await delay(10)

      expect(fsm.reject).to.have.been.calledOnce()
      expect(fsm.reject.args[0][0]).to.be.instanceOf(Error)
      expect(fsm.reject.args[0][0]).to.have.property('message')
      expect(fsm.reject.args[0][0].message).to.contain('ended early')
    })

    it('sets execute params on the fill when it is executed', async () => {
      const makerAddress = 'bolt:asdfjas0d9f09aj'
      fsm.fill.setExecuteParams = sinon.stub()
      subscribeExecuteStream.on.withArgs('data').callsArgWithAsync(1, { makerAddress })

      await fsm.fillOrder()
      await delay(10)

      expect(fsm.fill.setExecuteParams).to.have.been.calledOnce()
      expect(fsm.fill.setExecuteParams).to.have.been.calledWith(sinon.match({ makerAddress }))
    })

    it('executes the order after being filled', async () => {
      fsm.fill.setExecuteParams = sinon.stub()
      fsm.tryTo = sinon.stub()
      subscribeExecuteStream.on.withArgs('data').callsArgWithAsync(1, {})

      await fsm.fillOrder()
      await delay(10)

      expect(fsm.tryTo).to.have.been.calledOnce()
      expect(fsm.tryTo).to.have.been.calledWith('execute')
    })

    it('tears down listeners on error', async () => {
      fsm.reject = sinon.stub()
      subscribeExecuteStream.on.withArgs('error').callsArgWithAsync(1, new Error('fake error'))

      await fsm.fillOrder()

      await delay(10)

      expect(subscribeExecuteStream.removeListener).to.have.been.calledThrice()
      expect(subscribeExecuteStream.removeListener).to.have.been.calledWith('error')
      expect(subscribeExecuteStream.removeListener).to.have.been.calledWith('end')
      expect(subscribeExecuteStream.removeListener).to.have.been.calledWith('data')
    })

    it('tears down listeners on early close', async () => {
      fsm.reject = sinon.stub()
      subscribeExecuteStream.on.withArgs('end').callsArgAsync(1)

      await fsm.fillOrder()

      await delay(10)

      expect(subscribeExecuteStream.removeListener).to.have.been.calledThrice()
      expect(subscribeExecuteStream.removeListener).to.have.been.calledWith('error')
      expect(subscribeExecuteStream.removeListener).to.have.been.calledWith('end')
      expect(subscribeExecuteStream.removeListener).to.have.been.calledWith('data')
    })

    it('tears down listeners on complete', async () => {
      fsm.reject = sinon.stub()
      subscribeExecuteStream.on.withArgs('data').callsArgWithAsync(1, {})

      await fsm.fillOrder()

      await delay(10)

      expect(subscribeExecuteStream.removeListener).to.have.been.calledThrice()
      expect(subscribeExecuteStream.removeListener).to.have.been.calledWith('error')
      expect(subscribeExecuteStream.removeListener).to.have.been.calledWith('end')
      expect(subscribeExecuteStream.removeListener).to.have.been.calledWith('data')
    })
  })

  describe('#execute', () => {
    let fakeFill
    let fsm
    let executeSwapStub
    let fakeSwapHash
    let fakeMakerAddress
    let fakeOutboundAmount
    let fakeOutboundSymbol

    beforeEach(async () => {
      executeSwapStub = sinon.stub().resolves()
      fakeSwapHash = 'afaosijf'
      fakeMakerAddress = 'bolt:afasdf980as98f'
      fakeOutboundSymbol = 'LTC'
      fakeOutboundAmount = '900'

      fakeFill = {
        paramsForSwap: {
          swapHash: fakeSwapHash,
          symbol: fakeOutboundSymbol,
          amount: fakeOutboundAmount,
          makerAddress: fakeMakerAddress
        }
      }
      engines.set(fakeOutboundSymbol, { executeSwap: executeSwapStub })
      relayer = {
        takerService: {
          subscribeExecute: sinon.stub().returns({
            on: sinon.stub()
          })
        },
        identity: {
          authorize: sinon.stub()
        }
      }

      fsm = new FillStateMachine({ store, logger, relayer, engines })
      fsm.fill = fakeFill

      await fsm.goto('filled')
    })

    it('executes the swap', async () => {
      await fsm.execute()

      expect(executeSwapStub).to.have.been.calledOnce()
      expect(executeSwapStub).to.have.been.calledWith(fakeMakerAddress, fakeSwapHash, fakeOutboundAmount)
    })

    it('errors if the swap fails', () => {
      executeSwapStub.rejects(new Error('fake error'))

      return expect(fsm.execute()).to.eventually.be.rejectedWith('fake error')
    })
  })

  describe('#reject', () => {
    let fsm

    beforeEach(async () => {
      fsm = new FillStateMachine({ store, logger, relayer, engines })
      await fsm.goto('created')
      fsm.fill = {
        key: 'fakeKey',
        valueObject: { my: 'object' }
      }
    })

    it('moves to the rejected state', async () => {
      await fsm.reject()

      expect(fsm.state).to.be.equal('rejected')
    })

    it('assigns an error for the rejected state', async () => {
      const fakeError = new Error('my error')
      await fsm.reject(fakeError)

      expect(fsm.error).to.be.equal(fakeError)
    })

    it('saves in the rejected state', async () => {
      await fsm.reject()

      expect(store.put).to.have.been.calledOnce()
      expect(store.put).to.have.been.calledWith(fsm.fill.key, sinon.match('"state":"rejected"'))
    })

    it('saves with a placeholder key if one is not available', async () => {
      fsm.fill.key = undefined

      await fsm.reject()

      expect(store.put).to.have.been.calledOnce()
      expect(store.put).to.have.been.calledWith(sinon.match(/^NO_ASSIGNED_ID_\S+$/))
    })
  })

  describe('#shouldRetry', () => {
    let fakeFill
    let fsm

    beforeEach(() => {
      fsm = new FillStateMachine({ store, logger, relayer, engines })
      fakeFill = { error: { message: 'ORDER_NOT_PLACED' } }
      fsm.fill = fakeFill
    })

    it('returns true if the fsm error is a relayer error', async () => {
      expect(fsm.shouldRetry()).to.be.true()
    })

    it('returns false if there are no errors associated with the fill', async () => {
      fsm.fill.error = undefined

      expect(fsm.shouldRetry()).to.be.false()
    })

    it('returns false if the error code does not match the relayer error code', async () => {
      fsm.fill.error = { error: { code: 'NOT_RELAYER_ERROR' } }

      expect(fsm.shouldRetry()).to.be.false()
    })
  })

  describe('::create', () => {
    let blockOrderId
    let orderParams
    let fillParams
    let fakeKey
    let fakeValueObject
    let setCreatedParams
    let createFillResponse

    beforeEach(() => {
      createFillResponse = {
        fillId: 'fakeFillId',
        feePaymentRequest: 'lnbcas9df0as9fu',
        depositPaymentRequest: 'lnbcasd9fuas90f'
      }
      relayer.takerService.createFill.resolves(createFillResponse)
      blockOrderId = 'blockid'
      orderParams = {
        side: 'BID',
        baseSymbol: 'BTC',
        counterSymbol: 'LTC',
        baseAmount: '100000',
        counterAmount: '1000'
      }
      fillParams = {
        fillAmount: '90000',
        takerAddress: 'ln:asdfasdf'
      }
      fakeKey = 'mykey'
      fakeValueObject = {
        my: 'object'
      }
      Fill.prototype.key = fakeKey
      Fill.prototype.valueObject = fakeValueObject
      setCreatedParams = sinon.stub()
      Fill.prototype.setCreatedParams = setCreatedParams
      Fill.prototype.order = orderParams
      Fill.prototype.inboundAmount = '900'
      Fill.prototype.inboundSymbol = 'LTC'
      Fill.prototype.setSwapHash = sinon.stub()
    })

    it('initializes a state machine', async () => {
      const fsm = await FillStateMachine.create({ store, logger, relayer, engines }, blockOrderId, orderParams, fillParams)

      expect(fsm).to.be.instanceOf(FillStateMachine)
      expect(fsm).to.have.property('store', store)
    })

    it('runs a create transition on the state machine', async () => {
      const fsm = await FillStateMachine.create({ store, logger, relayer, engines }, blockOrderId, orderParams, fillParams)

      expect(fsm.state).to.be.equal('created')
      expect(store.put).to.have.been.calledOnce()
      expect(store.put).to.have.been.calledWith(fakeKey, sinon.match('"state":"created"'))
    })
  })

  describe('::fromStore', () => {
    let key
    let state
    let history
    let error
    let valueObject
    let value

    beforeEach(() => {
      Fill.fromObject = sinon.stub().returns({
        valueObject: {}
      })
      key = 'fakeKey'
      state = 'created'
      history = []
      error = undefined
      valueObject = {
        fill: { my: 'object' },
        state,
        history,
        error
      }
      value = JSON.stringify(valueObject)
    })

    it('initializes a state machine', async () => {
      const fsm = await FillStateMachine.fromStore({ store, logger, relayer, engines }, { key, value })

      expect(fsm).to.be.instanceOf(FillStateMachine)
      expect(fsm).to.have.property('store', store)
    })

    it('moves to the correct state', async () => {
      const fsm = await FillStateMachine.fromStore({ store, logger, relayer, engines }, { key, value })

      expect(fsm.state).to.be.equal(state)
    })

    it('contains the old history', async () => {
      history.push('created')
      value = JSON.stringify(valueObject)
      const fsm = await FillStateMachine.fromStore({ store, logger, relayer, engines }, { key, value })

      expect(fsm.history).to.be.an('array')
      expect(fsm.history).to.have.lengthOf(1)
      expect(fsm.history[0]).to.be.eql('created')
    })

    it('does not include the re-inflating in history', async () => {
      const fsm = await FillStateMachine.fromStore({ store, logger, relayer, engines }, { key, value })

      expect(fsm.history).to.be.an('array')
      expect(fsm.history).to.have.lengthOf(0)
    })

    it('includes saved errors', async () => {
      valueObject.error = 'fakeError'
      value = JSON.stringify(valueObject)

      const fsm = await FillStateMachine.fromStore({ store, logger, relayer, engines }, { key, value })

      expect(fsm.error).to.be.an('error')
      expect(fsm.error.message).to.be.eql('fakeError')
    })

    it('applies all the saved data', async () => {
      const myObject = 'fakeObject'
      Fill.fromObject.returns(myObject)

      const fsm = await FillStateMachine.fromStore({ store, logger, relayer, engines }, { key, value })

      expect(Fill.fromObject).to.have.been.calledOnce()
      expect(Fill.fromObject).to.have.been.calledWith(key, sinon.match({ my: 'object' }))
      expect(fsm.fill).to.be.equal(myObject)
    })
  })
})
