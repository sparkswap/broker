const path = require('path')
const { expect, rewire, sinon, delay } = require('test/test-helper')

const OrderStateMachine = rewire(path.resolve(__dirname, 'order-state-machine'))

describe('OrderStateMachine', () => {
  let Order

  let store
  let logger
  let relayer
  let engine

  beforeEach(() => {
    Order = sinon.stub()
    OrderStateMachine.__set__('Order', Order)

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
      makerService: {
        createOrder: sinon.stub()
      }
    }
    engine = {
      getPublicKey: sinon.stub()
    }
  })

  describe('new', () => {
    it('exposes the store', () => {
      const osm = new OrderStateMachine({ store, logger, relayer, engine })

      expect(osm).to.have.property('store', store)
    })

    it('exposes the logger', () => {
      const osm = new OrderStateMachine({ store, logger, relayer, engine })

      expect(osm).to.have.property('logger', logger)
    })

    it('exposes the relayer', () => {
      const osm = new OrderStateMachine({ store, logger, relayer, engine })

      expect(osm).to.have.property('relayer', relayer)
    })

    it('exposes the engine', () => {
      const osm = new OrderStateMachine({ store, logger, relayer, engine })

      expect(osm).to.have.property('engine', engine)
    })

    it('does not save a copy in the store', () => {
      new OrderStateMachine({ store, logger, relayer, engine }) // eslint-disable-line
      return expect(store.put).to.not.have.been.called
    })
  })

  describe('#tryTo', () => {
    let osm

    beforeEach(() => {
      osm = new OrderStateMachine({ store, logger, relayer, engine })
      osm.goto('created')
    })

    it('transitions on next tick', () => {
      osm.place = sinon.stub()
      const state = osm.state
      osm.tryTo('place')

      expect(osm.state).to.be.eql(state)
    })

    it('calls the transition', async () => {
      osm.place = sinon.stub()

      osm.tryTo('place')

      await delay(10)

      expect(osm.place).to.have.been.calledOnce()
    })

    it('passes through arguments', async () => {
      osm.place = sinon.stub()

      osm.tryTo('place', 'hello', 'world')

      await delay(10)

      expect(osm.place).to.have.been.calledOnce()
      expect(osm.place).to.have.been.calledWith('hello', 'world')
    })

    it('rejects on error', async () => {
      const fakeError = new Error('my error')

      osm.place = sinon.stub().rejects(fakeError)
      osm.reject = sinon.stub()

      osm.tryTo('place')

      await delay(10)

      expect(osm.reject).to.have.been.calledOnce()
      expect(osm.reject).to.have.been.calledWith(fakeError)
    })

    it('moves to rejected if using an invalid transition', async () => {
      osm.reject = sinon.stub()

      osm.tryTo('blergh')

      await delay(10)

      expect(osm.reject).to.have.been.calledOnce()
    })
  })

  describe('#persist', () => {
    let osm
    let key

    beforeEach(() => {
      osm = new OrderStateMachine({ store, logger, relayer, engine })
      osm.order = {
        valueObject: { my: 'order' }
      }
      key = 'fakeKey'
    })

    it('throws if no key is available', () => {
      return expect(osm.persist()).to.eventually.be.rejectedWith(Error)
    })

    it('stringifies values', async () => {
      await osm.persist(key)

      expect(store.put).to.have.been.calledOnce()
      expect(store.put).to.have.been.calledWith(sinon.match.any, sinon.match.string)
    })

    it('uses the key to save values', async () => {
      await osm.persist(key)

      expect(store.put).to.have.been.calledOnce()
      expect(store.put).to.have.been.calledWith(key)
    })

    it('saves state machine data in the database', async () => {
      await osm.persist(key)

      expect(store.put).to.have.been.calledWith(sinon.match.any, sinon.match('{"state":"none","order":{"my":"order"},"history":[]}'))
    })

    it('saves the order to the database', async () => {
      await osm.persist(key)

      expect(store.put).to.have.been.calledWith(sinon.match.any, sinon.match('"my":"order"'))
    })

    it('saves the state in the database', async () => {
      await osm.persist(key)

      expect(store.put).to.have.been.calledWith(sinon.match.any, sinon.match('"state":"none"'))
    })

    it('saves history in the database', async () => {
      await osm.goto('created')
      await osm.persist(key)

      expect(store.put).to.have.been.calledWith(sinon.match.any, sinon.match('"history":["created"]'))
    })

    it('saves error in the database', async () => {
      osm.error = new Error('fakeError')
      await osm.persist(key)

      expect(store.put).to.have.been.calledWith(sinon.match.any, sinon.match('"error":"fakeError"'))
    })
  })

  describe('#create', () => {
    let osm
    let blockOrderId
    let params
    let setCreatedParams
    let fakeKey
    let fakeValueObject
    let createOrderResponse

    beforeEach(() => {
      fakeKey = 'mykey'
      fakeValueObject = {
        my: 'object'
      }
      Order.prototype.key = fakeKey
      Order.prototype.valueObject = fakeValueObject
      setCreatedParams = sinon.stub()
      Order.prototype.setCreatedParams = setCreatedParams
      createOrderResponse = {
        orderId: 'fakeID',
        feePaymentRequest: 'lnbcq0w98f0as98df',
        depositPaymentRequest: 'lnbcas09fas09df8'
      }
      relayer.makerService.createOrder.resolves(createOrderResponse)
      osm = new OrderStateMachine({ store, logger, relayer, engine })
      blockOrderId = 'blockid'
      params = {
        side: 'BID',
        baseSymbol: 'ABC',
        counterSymbol: 'XYZ',
        baseAmount: '100000',
        counterAmount: '1000'
      }
    })

    it('creates an order model', async () => {
      await osm.create(blockOrderId, params)

      expect(Order).to.have.been.calledOnce()
      expect(Order).to.have.been.calledWithNew()
      expect(osm).to.have.property('order')
      expect(osm.order).to.be.instanceOf(Order)
    })

    it('passes the params to the order model', async () => {
      await osm.create(blockOrderId, params)

      expect(Order).to.have.been.calledWith(blockOrderId, sinon.match(params))
    })

    it('creates a payTo for the order', async () => {
      const fakeKey = 'mykey'
      engine.getPublicKey.resolves(fakeKey)

      await osm.create(blockOrderId, params)

      expect(engine.getPublicKey).to.have.been.calledOnce()
      expect(Order).to.have.been.calledWith(sinon.match.any, sinon.match({ payTo: `ln:${fakeKey}` }))
    })

    xit('creates an ownerId for the order')

    it('creates an order on the relayer', async () => {
      const fakeParams = {
        my: 'fake'
      }
      Order.prototype.paramsForCreate = fakeParams

      await osm.create(blockOrderId, params)

      expect(relayer.makerService.createOrder).to.have.been.calledOnce()
      expect(relayer.makerService.createOrder).to.have.been.calledWith(fakeParams)
    })

    it('updates the order with returned params', async () => {
      await osm.create(blockOrderId, params)

      expect(setCreatedParams).to.have.been.calledOnce()
      expect(setCreatedParams).to.have.been.calledWith(sinon.match({
        orderId: createOrderResponse.orderId,
        feePaymentRequest: createOrderResponse.feePaymentRequest,
        depositPaymentRequest: createOrderResponse.depositPaymentRequest
      }))
    })

    it('saves a copy in the store', async () => {
      await osm.create(blockOrderId, params)

      expect(store.put).to.have.been.calledOnce()
      expect(store.put).to.have.been.calledWith(fakeKey, sinon.match('"my":"object"'))
    })

    it('saves the current state in the store', async () => {
      await osm.create(blockOrderId, params)

      expect(store.put).to.have.been.calledOnce()
      expect(store.put).to.have.been.calledWith(fakeKey, sinon.match('"state":"created"'))
    })

    it('throws an error in creation on the relayer fails', () => {
      relayer.makerService.createOrder.rejects(new Error('fake error'))

      return expect(osm.create(blockOrderId, params)).to.be.rejectedWith(Error)
    })

    it('cancels the transition if the creation on the relayer fails', async () => {
      relayer.makerService.createOrder.rejects()

      try {
        await osm.create(blockOrderId, params)
      } catch (e) {
        expect(osm.state).to.be.equal('none')
      }
    })

    it('does not save a copy if creation on the relayer fails', async () => {
      relayer.makerService.createOrder.rejects()

      try {
        await osm.create(blockOrderId, params)
      } catch (e) {
        return expect(store.put).to.not.have.been.called
      }
    })

    it('automatically attempts to place an order after creation', async () => {
      osm.tryTo = sinon.stub()
      await osm.create(blockOrderId, params)

      await delay(10)
      expect(osm.tryTo).to.have.been.calledOnce()
      expect(osm.tryTo).to.have.been.calledWith('place')
    })
  })

  describe('#place', () => {
    let fakeOrder
    let osm
    let payInvoiceStub
    let createRefundInvoiceStub
    let placeOrderStub
    let subscribeFillStub
    let subscribeFillStreamStub
    let invoice
    let feePaymentRequest
    let depositPaymentRequest
    let orderId

    beforeEach(async () => {
      invoice = '1234'
      payInvoiceStub = sinon.stub()
      createRefundInvoiceStub = sinon.stub().returns(invoice)
      placeOrderStub = sinon.stub()
      subscribeFillStreamStub = {
        on: sinon.stub()
      }
      subscribeFillStub = sinon.stub().returns(subscribeFillStreamStub)
      feePaymentRequest = 'fee'
      depositPaymentRequest = 'deposit'
      orderId = '1234'

      fakeOrder = { feePaymentRequest, depositPaymentRequest, orderId }
      engine = { payInvoice: payInvoiceStub, createRefundInvoice: createRefundInvoiceStub }
      relayer = {
        makerService: {
          placeOrder: placeOrderStub,
          subscribeFill: subscribeFillStub
        }
      }

      osm = new OrderStateMachine({ store, logger, relayer, engine })
      osm.order = fakeOrder

      await osm.goto('created')
    })

    it('pays a fee invoice', async () => {
      await osm.place()
      expect(payInvoiceStub).to.have.been.calledWith(feePaymentRequest)
    })

    it('pays a deposit invoice', async () => {
      await osm.place()
      expect(payInvoiceStub).to.have.been.calledWith(depositPaymentRequest)
    })

    it('creates a deposit refund invoice', async () => {
      await osm.place()
      expect(createRefundInvoiceStub).to.have.been.calledWith(feePaymentRequest)
    })

    it('pays a fee refund invoice', async () => {
      await osm.place()
      expect(createRefundInvoiceStub).to.have.been.calledWith(depositPaymentRequest)
    })

    it('places an order on the relayer', async () => {
      await osm.place()
      expect(placeOrderStub).to.have.been.calledWith(sinon.match({
        feeRefundPaymentRequest: invoice,
        depositRefundPaymentRequest: invoice,
        orderId
      }))
    })

    it('errors if a feePaymentRequest isnt available on an order', async () => {
      osm.order = {}
      return expect(osm.place()).to.eventually.be.rejectedWith('Cant pay invoices because fee')
    })

    it('errors if a feePaymentRequest isnt available on an order', async () => {
      osm.order = { feePaymentRequest }
      return expect(osm.place()).to.eventually.be.rejectedWith('Cant pay invoices because deposit')
    })

    it('does not subscribe to fills for orders that fail', async () => {
      placeOrderStub.rejects(new Error('fake error'))

      expect(subscribeFillStub).to.not.have.been.called()
    })

    it('subscribes to fills on the relayer', async () => {
      await osm.place()
      expect(subscribeFillStub).to.have.been.calledOnce()
      expect(subscribeFillStub).to.have.been.calledWith(sinon.match({ orderId }))
    })

    it('rejects on error from the relayer subscribe fill hook', async () => {
      osm.reject = sinon.stub()
      subscribeFillStreamStub.on.withArgs('error').callsArgWithAsync(1, new Error('fake error'))

      await osm.place()

      await delay(10)

      expect(osm.reject).to.have.been.calledOnce()
      expect(osm.reject.args[0][0]).to.be.instanceOf(Error)
      expect(osm.reject.args[0][0]).to.have.property('message', 'fake error')
    })

    it('cancels the order when the order is in a cancelled state', async () => {
      osm.tryTo = sinon.stub()
      subscribeFillStreamStub.on.withArgs('data').callsArgWithAsync(1, { orderStatus: 'CANCELLED' })

      await osm.place()
      await delay(10)

      expect(osm.tryTo).to.have.been.calledOnce()
      expect(osm.tryTo).to.have.been.calledWith('cancel')
    })

    it('sets fill params on the order when it is filled', async () => {
      const swapHash = 'asofijasfd'
      const fillAmount = '1000'
      osm.order.setFilledParams = sinon.stub()
      subscribeFillStreamStub.on.withArgs('data').callsArgWithAsync(1, { fill: { swapHash, fillAmount } })

      await osm.place()
      await delay(10)

      expect(osm.order.setFilledParams).to.have.been.calledOnce()
      expect(osm.order.setFilledParams).to.have.been.calledWith(sinon.match({ swapHash, fillAmount }))
    })

    it('executes the order after being filled', async () => {
      osm.order.setFilledParams = sinon.stub()
      osm.tryTo = sinon.stub()
      subscribeFillStreamStub.on.withArgs('data').callsArgWithAsync(1, { fill: {} })

      await osm.place()
      await delay(10)

      expect(osm.tryTo).to.have.been.calledOnce()
      expect(osm.tryTo).to.have.been.calledWith('execute')
    })
  })

  describe('#execute', () => {
    let fakeOrder
    let osm
    let executeOrderStub
    let prepareSwapStub
    let orderId
    let swapHash
    let inboundSymbol
    let inboundAmount
    let outboundSymbol
    let outboundAmount

    beforeEach(async () => {
      executeOrderStub = sinon.stub().resolves()
      prepareSwapStub = sinon.stub().resolves()
      orderId = '1234'
      swapHash = '0q9wudf09asdf'
      inboundSymbol = 'LTC'
      inboundAmount = '10000'
      outboundSymbol = 'BTC'
      outboundAmount = '100'

      fakeOrder = {
        orderId,
        swapHash,
        inboundAmount,
        inboundSymbol,
        outboundSymbol,
        outboundAmount,
        paramsForPrepareSwap: {
          swapHash,
          inbound: {
            symbol: inboundSymbol,
            amount: inboundAmount
          },
          outbound: {
            symbol: outboundSymbol,
            amount: outboundAmount
          }
        }
      }
      engine = { prepareSwap: prepareSwapStub }
      relayer = {
        makerService: {
          executeOrder: executeOrderStub
        }
      }

      osm = new OrderStateMachine({ store, logger, relayer, engine })
      osm.onEnterPlaced = sinon.stub()
      osm.order = fakeOrder

      await osm.goto('placed')
    })

    it('prepares the swap on the engine', async () => {
      await osm.execute()

      expect(prepareSwapStub).to.have.been.calledOnce()

      const inbound = { amount: inboundAmount, symbol: inboundSymbol }
      const outbound = { amount: outboundAmount, symbol: outboundSymbol }
      expect(prepareSwapStub).to.have.been.calledWith(swapHash, inbound, outbound)
    })

    it('executes the order on the relayer', async () => {
      await osm.execute()

      expect(relayer.makerService.executeOrder).to.have.been.calledOnce()
      expect(relayer.makerService.executeOrder).to.have.been.calledWith({ orderId })
    })
  })

  describe('#goto', () => {
    let osm

    beforeEach(() => {
      osm = new OrderStateMachine({ store, logger, relayer, engine })
    })

    it('moves the state to the given state', async () => {
      await osm.goto('created')

      expect(osm.state).to.be.equal('created')
    })

    it('does not save a copy in the store', async () => {
      await osm.goto('created')

      return expect(store.put).to.not.have.been.called
    })
  })

  describe('#reject', () => {
    let osm
    let onRejection

    beforeEach(async () => {
      onRejection = sinon.stub()
      osm = new OrderStateMachine({ store, logger, relayer, engine, onRejection })
      await osm.goto('created')
      osm.order = {
        key: 'fakeKey',
        valueObject: { my: 'object' }
      }
    })

    it('moves to the rejected state', async () => {
      await osm.reject()

      expect(osm.state).to.be.equal('rejected')
    })

    it('assigns an error for the rejected state', async () => {
      const fakeError = new Error('my error')
      await osm.reject(fakeError)

      expect(osm.error).to.be.equal(fakeError)
    })

    it('saves in the rejected state', async () => {
      await osm.reject()

      expect(store.put).to.have.been.calledOnce()
      expect(store.put).to.have.been.calledWith(osm.order.key, sinon.match('"state":"rejected"'))
    })

    it('saves with a placeholder key if one is not available', async () => {
      osm.order.key = undefined

      await osm.reject()

      expect(store.put).to.have.been.calledOnce()
      expect(store.put).to.have.been.calledWith(sinon.match(/^NO_ASSIGNED_ID\S+$/))
    })

    it('calls an onRejection function', async () => {
      const err = new Error('fake')
      await osm.reject(err)

      expect(onRejection).to.have.been.calledOnce()
      expect(onRejection).to.have.been.calledWith(err)
    })
  })

  describe('::create', () => {
    let blockOrderId
    let params
    let fakeKey
    let fakeValueObject
    let setCreatedParams
    let createOrderResponse

    beforeEach(() => {
      blockOrderId = 'blockid'
      params = {
        side: 'BID',
        baseSymbol: 'ABC',
        counterSymbol: 'XYZ',
        baseAmount: '100000',
        counterAmount: '1000'
      }
      fakeKey = 'mykey'
      fakeValueObject = {
        my: 'object'
      }
      Order.prototype.key = fakeKey
      Order.prototype.valueObject = fakeValueObject
      setCreatedParams = sinon.stub()
      Order.prototype.setCreatedParams = setCreatedParams
      createOrderResponse = {
        orderId: 'fakeID',
        feePaymentRequest: 'lnbcq0w98f0as98df',
        depositPaymentRequest: 'lnbcas09fas09df8'
      }
      relayer.makerService.createOrder.resolves(createOrderResponse)
    })

    it('initializes a state machine', async () => {
      const osm = await OrderStateMachine.create({ store, logger, relayer, engine }, blockOrderId, params)

      expect(osm).to.be.instanceOf(OrderStateMachine)
      expect(osm).to.have.property('store', store)
    })

    it('runs a create transition on the state machine', async () => {
      const osm = await OrderStateMachine.create({ store, logger, relayer, engine }, blockOrderId, params)

      expect(osm.state).to.be.equal('created')
      expect(store.put).to.have.been.calledOnce()
      expect(store.put).to.have.been.calledWith(fakeKey, sinon.match('"state":"created"'))
    })
  })

  describe('::getAll', () => {
    let fakeRecords
    let fakeOrder
    let state
    let store
    let logger

    beforeEach(() => {
      state = 'created'

      fakeRecords = [ ['fakeKey', JSON.stringify({
        order: { my: 'object' },
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

      fakeOrder = 'myorder'
      Order.fromObject = sinon.stub().returns(fakeOrder)
    })

    it('gets all records from the store', async () => {
      await OrderStateMachine.getAll({ store, logger })

      expect(store.createReadStream).to.have.been.calledOnce()
    })

    it('instantiates an OrderStateMachine for each record', async () => {
      const osms = await OrderStateMachine.getAll({ store, logger })

      expect(osms).to.have.lengthOf(1)
      expect(osms[0]).to.be.instanceOf(OrderStateMachine)
    })

    it('moves the OrderStateMachine to the correct state', async () => {
      const osms = await OrderStateMachine.getAll({ store, logger })

      expect(osms).to.have.lengthOf(1)
      expect(osms[0]).to.have.property('state', state)
    })

    it('assigns the order to the state machine', async () => {
      const osms = await OrderStateMachine.getAll({ store, logger })

      expect(osms[0].order).to.be.eql(fakeOrder)
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
      Order.fromObject = sinon.stub().returns({
        valueObject: {}
      })
      key = 'fakeKey'
      state = 'created'
      history = []
      error = undefined
      valueObject = {
        order: { my: 'object' },
        state,
        history,
        error
      }
      value = JSON.stringify(valueObject)
    })

    it('initializes a state machine', async () => {
      const osm = await OrderStateMachine.fromStore({ store, logger, relayer, engine }, { key, value })

      expect(osm).to.be.instanceOf(OrderStateMachine)
      expect(osm).to.have.property('store', store)
    })

    it('moves to the correct state', async () => {
      const osm = await OrderStateMachine.fromStore({ store, logger, relayer, engine }, { key, value })

      expect(osm.state).to.be.equal(state)
    })

    it('contains the old history', async () => {
      history.push('created')
      value = JSON.stringify(valueObject)
      const osm = await OrderStateMachine.fromStore({ store, logger, relayer, engine }, { key, value })

      expect(osm.history).to.be.an('array')
      expect(osm.history).to.have.lengthOf(1)
      expect(osm.history[0]).to.be.eql('created')
    })

    it('does not include the re-inflating in history', async () => {
      const osm = await OrderStateMachine.fromStore({ store, logger, relayer, engine }, { key, value })

      expect(osm.history).to.be.an('array')
      expect(osm.history).to.have.lengthOf(0)
    })

    it('includes saved errors', async () => {
      valueObject.error = 'fakeError'
      value = JSON.stringify(valueObject)

      const osm = await OrderStateMachine.fromStore({ store, logger, relayer, engine }, { key, value })

      expect(osm.error).to.be.an('error')
      expect(osm.error.message).to.be.eql('fakeError')
    })

    it('applies all the saved data', async () => {
      const myObject = 'fakeObject'
      Order.fromObject.returns(myObject)

      const osm = await OrderStateMachine.fromStore({ store, logger, relayer, engine }, { key, value })

      expect(Order.fromObject).to.have.been.calledOnce()
      expect(Order.fromObject).to.have.been.calledWith(key, sinon.match({ my: 'object' }))
      expect(osm.order).to.be.equal(myObject)
    })
  })
})
