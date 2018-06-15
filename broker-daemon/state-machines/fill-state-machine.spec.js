const path = require('path')
const { expect, rewire, sinon, delay } = require('test/test-helper')

const FillStateMachine = rewire(path.resolve(__dirname, 'fill-state-machine'))

describe('FillStateMachine', () => {
  let Fill

  let store
  let logger
  let relayer
  let engine

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
      }
    }
    engine = {
      createSwapHash: sinon.stub().resolves()
    }
  })

  describe('new', () => {
    it('exposes the store', () => {
      const fsm = new FillStateMachine({ store, logger, relayer, engine })

      expect(fsm).to.have.property('store', store)
    })

    it('exposes the logger', () => {
      const fsm = new FillStateMachine({ store, logger, relayer, engine })

      expect(fsm).to.have.property('logger', logger)
    })

    it('exposes the relayer', () => {
      const fsm = new FillStateMachine({ store, logger, relayer, engine })

      expect(fsm).to.have.property('relayer', relayer)
    })

    it('exposes the engine', () => {
      const fsm = new FillStateMachine({ store, logger, relayer, engine })

      expect(fsm).to.have.property('engine', engine)
    })

    it('does not save a copy in the store', () => {
      new FillStateMachine({ store, logger, relayer, engine }) // eslint-disable-line
      return expect(store.put).to.not.have.been.called
    })
  })

  describe('#tryTo', () => {
    let fsm

    beforeEach(() => {
      fsm = new FillStateMachine({ store, logger, relayer, engine })
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
      fsm = new FillStateMachine({ store, logger, relayer, engine })
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
      fsm = new FillStateMachine({ store, logger, relayer, engine })
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
      fsm = new FillStateMachine({ store, logger, relayer, engine })
      orderParams = {
        orderId: 'faklsadfjo',
        side: 'BID',
        baseSymbol: 'ABC',
        counterSymbol: 'XYZ',
        baseAmount: '100000',
        counterAmount: '1000'
      }
      fillParams = {
        fillAmount: '90000'
      }

      Fill.prototype.order = orderParams
      Fill.prototype.inboundAmount = '900'
    })

    it('creates a fill model', async () => {
      await fsm.create(orderParams, fillParams)

      expect(Fill).to.have.been.calledOnce()
      expect(Fill).to.have.been.calledWithNew()
      expect(fsm).to.have.property('fill')
      expect(fsm.fill).to.be.instanceOf(Fill)
    })

    it('passes the params to the fill model', async () => {
      await fsm.create(orderParams, fillParams)

      expect(Fill).to.have.been.calledWith(sinon.match(orderParams), sinon.match(fillParams))
    })

    it('creates a swap hash for the fill', async () => {
      const fakeHash = Buffer.from('fakeHash')
      engine.createSwapHash.resolves(fakeHash)

      await fsm.create(orderParams, fillParams)

      expect(engine.createSwapHash).to.have.been.calledOnce()
      expect(engine.createSwapHash).to.have.been.calledWith(orderParams.orderId, '900')
      expect(fsm.fill.setSwapHash).to.have.been.calledOnce()
      expect(fsm.fill.setSwapHash).to.have.been.calledWith(fakeHash)
    })

    it('creates a fill on the relayer', async () => {
      const fakeParams = {
        my: 'fake'
      }
      Fill.prototype.paramsForCreate = fakeParams

      await fsm.create(orderParams, fillParams)

      expect(relayer.takerService.createFill).to.have.been.calledOnce()
      expect(relayer.takerService.createFill).to.have.been.calledWith(fakeParams)
    })

    it('updates the fill with returned params', async () => {
      await fsm.create(orderParams, fillParams)

      expect(setCreatedParams).to.have.been.calledOnce()
      expect(setCreatedParams).to.have.been.calledWith(sinon.match(createFillResponse))
    })

    it('saves a copy in the store', async () => {
      await fsm.create(orderParams, fillParams)

      expect(store.put).to.have.been.calledOnce()
      expect(store.put).to.have.been.calledWith(fakeKey, sinon.match('"my":"object"'))
    })

    it('saves the current state in the store', async () => {
      await fsm.create(orderParams, fillParams)

      expect(store.put).to.have.been.calledOnce()
      expect(store.put).to.have.been.calledWith(fakeKey, sinon.match('"state":"created"'))
    })

    it('throws an error in creation on the relayer fails', () => {
      relayer.takerService.createFill.rejects(new Error('fake error'))

      return expect(fsm.create(orderParams, fillParams)).to.be.rejectedWith(Error)
    })

    it('cancels the transition if the creation on the relayer fails', async () => {
      relayer.takerService.createFill.rejects()

      try {
        await fsm.create(orderParams, fillParams)
      } catch (e) {
        expect(fsm.state).to.be.equal('none')
      }
    })

    it('does not save a copy if creation on the relayer fails', async () => {
      relayer.takerService.createFill.rejects()

      try {
        await fsm.create(orderParams, fillParams)
      } catch (e) {
        return expect(store.put).to.not.have.been.called
      }
    })

    it('automatically attempts to fill the order after fill creation', async () => {
      fsm.tryTo = sinon.stub()
      await fsm.create(orderParams, fillParams)

      await delay(10)
      expect(fsm.tryTo).to.have.been.calledOnce()
      expect(fsm.tryTo).to.have.been.calledWith('fillOrder')
    })
  })

  describe('#fillOrder', () => {
    let fakeFill
    let fsm
    let payInvoiceStub
    let fillOrderStub
    let subscribeExecuteStub
    let subscribeExecuteStream
    let invoice
    let feePaymentRequest
    let depositPaymentRequest
    let fillId

    beforeEach(async () => {
      invoice = '1234'
      payInvoiceStub = sinon.stub().returns(invoice)
      fillOrderStub = sinon.stub()
      subscribeExecuteStream = {
        on: sinon.stub()
      }
      subscribeExecuteStub = sinon.stub().returns(subscribeExecuteStream)
      feePaymentRequest = 'fee'
      depositPaymentRequest = 'deposit'
      fillId = '1234'

      fakeFill = { feePaymentRequest, depositPaymentRequest, fillId }
      engine = { payInvoice: payInvoiceStub }
      relayer = {
        takerService: {
          fillOrder: fillOrderStub,
          subscribeExecute: subscribeExecuteStub
        }
      }

      fsm = new FillStateMachine({ store, logger, relayer, engine })
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

    it('fills an order on the relayer', async () => {
      await fsm.fillOrder()
      expect(fillOrderStub).to.have.been.calledWith(sinon.match({
        feeRefundPaymentRequest: invoice,
        depositRefundPaymentRequest: invoice,
        fillId
      }))
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

    it('subscribes to fills on the relayer', async () => {
      await fsm.fillOrder()
      expect(subscribeExecuteStub).to.have.been.calledOnce()
      expect(subscribeExecuteStub).to.have.been.calledWith(sinon.match({ fillId }))
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

    it('sets execute params on the fill when it is executed', async () => {
      const payTo = 'ln:asdfjas0d9f09aj'
      fsm.fill.setExecuteParams = sinon.stub()
      subscribeExecuteStream.on.withArgs('data').callsArgWithAsync(1, { payTo })

      await fsm.fillOrder()
      await delay(10)

      expect(fsm.fill.setExecuteParams).to.have.been.calledOnce()
      expect(fsm.fill.setExecuteParams).to.have.been.calledWith(sinon.match({ payTo }))
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
  })

  describe('#execute', () => {
    let fakeFill
    let fsm
    let executeSwapStub
    let fakeSwapHash
    let fakeCounterpartyPubKey
    let fakeInbound
    let fakeOutbound

    beforeEach(async () => {
      executeSwapStub = sinon.stub().resolves()
      fakeSwapHash = 'afaosijf'
      fakeCounterpartyPubKey = 'afasdf980as98f'
      fakeInbound = { fake: 'inbound' }
      fakeOutbound = { fake: 'outbound' }

      fakeFill = {
        paramsForSwap: {
          swapHash: fakeSwapHash,
          inbound: fakeInbound,
          outbound: fakeOutbound,
          counterpartyPubKey: fakeCounterpartyPubKey
        }
      }
      engine = { executeSwap: executeSwapStub }
      relayer = {
        takerService: {
          subscribeExecute: sinon.stub().returns({
            on: sinon.stub()
          })
        }
      }

      fsm = new FillStateMachine({ store, logger, relayer, engine })
      fsm.fill = fakeFill

      await fsm.goto('filled')
    })

    it('executes the swap', async () => {
      await fsm.execute()

      expect(executeSwapStub).to.have.been.calledOnce()
      expect(executeSwapStub).to.have.been.calledWith(fakeCounterpartyPubKey, fakeSwapHash, fakeInbound, fakeOutbound)
    })

    it('errors if the swap fails', () => {
      executeSwapStub.rejects(new Error('fake error'))

      return expect(fsm.execute()).to.eventually.be.rejectedWith('fake error')
    })
  })

  describe('#reject', () => {
    let fsm
    let onRejection

    beforeEach(async () => {
      onRejection = sinon.stub()
      fsm = new FillStateMachine({ store, logger, relayer, engine, onRejection })
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

    it('calls an onRejection function', async () => {
      const err = new Error('fake')
      await fsm.reject(err)

      expect(onRejection).to.have.been.calledOnce()
      expect(onRejection).to.have.been.calledWith(err)
    })
  })

  describe('::create', () => {
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
      orderParams = {
        side: 'BID',
        baseSymbol: 'ABC',
        counterSymbol: 'XYZ',
        baseAmount: '100000',
        counterAmount: '1000'
      }
      fillParams = {
        fillAmount: '90000'
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
      Fill.prototype.setSwapHash = sinon.stub()
    })

    it('initializes a state machine', async () => {
      const fsm = await FillStateMachine.create({ store, logger, relayer, engine }, orderParams, fillParams)

      expect(fsm).to.be.instanceOf(FillStateMachine)
      expect(fsm).to.have.property('store', store)
    })

    it('runs a create transition on the state machine', async () => {
      const fsm = await FillStateMachine.create({ store, logger, relayer, engine }, orderParams, fillParams)

      expect(fsm.state).to.be.equal('created')
      expect(store.put).to.have.been.calledOnce()
      expect(store.put).to.have.been.calledWith(fakeKey, sinon.match('"state":"created"'))
    })
  })

  describe('::getAll', () => {
    let fakeRecords
    let fakeFill
    let state
    let store
    let logger

    beforeEach(() => {
      state = 'none'

      fakeRecords = [ ['fakeKey', JSON.stringify({
        fill: { my: 'object' },
        state
      })] ]

      store = {
        put: sinon.stub(),
        get: sinon.stub(),
        createReadStream: sinon.stub().callsFake(() => {
          return {
            on: async function (event, fn) {
              if (event === 'data') {
                for (var i = 0; i < fakeRecords.length; i++) {
                  await delay(5)
                  fn({ key: fakeRecords[i][0], value: fakeRecords[i][1] })
                }
              } else if (event === 'end') {
                await delay(fakeRecords.length * 5 + 5)
                fn()
              }
            }
          }
        })
      }

      logger = {
        info: sinon.stub(),
        debug: sinon.stub(),
        error: sinon.stub()
      }

      fakeFill = 'myorder'
      Fill.fromObject = sinon.stub().returns(fakeFill)
    })

    it('gets all records from the store', async () => {
      await FillStateMachine.getAll({ store, logger })

      expect(store.createReadStream).to.have.been.calledOnce()
    })

    it('instantiates an FillStateMachine for each record', async () => {
      const fsms = await FillStateMachine.getAll({ store, logger })

      expect(fsms).to.have.lengthOf(1)
      expect(fsms[0]).to.be.instanceOf(FillStateMachine)
    })

    it('moves the FillStateMachine to the correct state', async () => {
      const fsms = await FillStateMachine.getAll({ store, logger })

      expect(fsms).to.have.lengthOf(1)
      expect(fsms[0]).to.have.property('state', state)
    })

    it('assigns the fill to the state machine', async () => {
      const fsms = await FillStateMachine.getAll({ store, logger })

      expect(fsms[0].fill).to.be.eql(fakeFill)
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
      const fsm = await FillStateMachine.fromStore({ store, logger, relayer, engine }, { key, value })

      expect(fsm).to.be.instanceOf(FillStateMachine)
      expect(fsm).to.have.property('store', store)
    })

    it('moves to the correct state', async () => {
      const fsm = await FillStateMachine.fromStore({ store, logger, relayer, engine }, { key, value })

      expect(fsm.state).to.be.equal(state)
    })

    it('contains the old history', async () => {
      history.push('created')
      value = JSON.stringify(valueObject)
      const fsm = await FillStateMachine.fromStore({ store, logger, relayer, engine }, { key, value })

      expect(fsm.history).to.be.an('array')
      expect(fsm.history).to.have.lengthOf(1)
      expect(fsm.history[0]).to.be.eql('created')
    })

    it('does not include the re-inflating in history', async () => {
      const fsm = await FillStateMachine.fromStore({ store, logger, relayer, engine }, { key, value })

      expect(fsm.history).to.be.an('array')
      expect(fsm.history).to.have.lengthOf(0)
    })

    it('includes saved errors', async () => {
      valueObject.error = 'fakeError'
      value = JSON.stringify(valueObject)

      const fsm = await FillStateMachine.fromStore({ store, logger, relayer, engine }, { key, value })

      expect(fsm.error).to.be.an('error')
      expect(fsm.error.message).to.be.eql('fakeError')
    })

    it('applies all the saved data', async () => {
      const myObject = 'fakeObject'
      Fill.fromObject.returns(myObject)

      const fsm = await FillStateMachine.fromStore({ store, logger, relayer, engine }, { key, value })

      expect(Fill.fromObject).to.have.been.calledOnce()
      expect(Fill.fromObject).to.have.been.calledWith(key, sinon.match({ my: 'object' }))
      expect(fsm.fill).to.be.equal(myObject)
    })
  })
})
