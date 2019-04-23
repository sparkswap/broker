const path = require('path')
const { expect, rewire, sinon, delay } = require('test/test-helper')

const OrderStateMachine = rewire(path.resolve(__dirname, 'order-state-machine'))

describe('OrderStateMachine', () => {
  let Order

  let store
  let logger
  let relayer
  let engines
  let getPaymentChannelNetworkAddressStub
  let payInvoiceStub

  beforeEach(() => {
    Order = sinon.stub()
    OrderStateMachine.__set__('Order', Order)

    payInvoiceStub = sinon.stub()
    OrderStateMachine.__set__('payInvoice', payInvoiceStub)

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
      },
      identity: {
        authorize: sinon.stub()
      }
    }
    getPaymentChannelNetworkAddressStub = sinon.stub().resolves('bolt:adsfsdf')
    engines = new Map([
      ['BTC', { getPaymentChannelNetworkAddress: getPaymentChannelNetworkAddressStub }],
      ['LTC', { getPaymentChannelNetworkAddress: getPaymentChannelNetworkAddressStub }]
    ])
  })

  describe('new', () => {
    it('exposes the store', () => {
      const osm = new OrderStateMachine({ store, logger, relayer, engines })

      expect(osm).to.have.property('store', store)
    })

    it('exposes the logger', () => {
      const osm = new OrderStateMachine({ store, logger, relayer, engines })

      expect(osm).to.have.property('logger', logger)
    })

    it('exposes the relayer', () => {
      const osm = new OrderStateMachine({ store, logger, relayer, engines })

      expect(osm).to.have.property('relayer', relayer)
    })

    it('exposes the engines', () => {
      const osm = new OrderStateMachine({ store, logger, relayer, engines })

      expect(osm).to.have.property('engines', engines)
    })

    it('does not save a copy in the store', () => {
      new OrderStateMachine({ store, logger, relayer, engines }) // eslint-disable-line
      return expect(store.put).to.not.have.been.called
    })
  })

  describe('#tryTo', () => {
    let osm

    beforeEach(() => {
      osm = new OrderStateMachine({ store, logger, relayer, engines })
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
      osm = new OrderStateMachine({ store, logger, relayer, engines })
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
      Order.prototype.baseSymbol = 'BTC'
      Order.prototype.counterSymbol = 'BTC'

      setCreatedParams = sinon.stub()
      Order.prototype.setCreatedParams = setCreatedParams
      createOrderResponse = {
        orderId: 'fakeID',
        feePaymentRequest: 'lnbcq0w98f0as98df',
        depositPaymentRequest: 'lnbcas09fas09df8'
      }
      relayer.makerService.createOrder.resolves(createOrderResponse)
      osm = new OrderStateMachine({ store, logger, relayer, engines })
      blockOrderId = 'blockid'
      params = {
        side: 'BID',
        baseSymbol: 'BTC',
        counterSymbol: 'LTC',
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

    it('gets the makerAddress for the order', async () => {
      await osm.create(blockOrderId, params)

      expect(getPaymentChannelNetworkAddressStub).to.have.been.calledTwice()
      expect(osm.order.makerBaseAddress).to.be.equal('bolt:adsfsdf')
      expect(osm.order.makerCounterAddress).to.be.equal('bolt:adsfsdf')
    })

    it('throws if no engine exists for the inbound symbol', () => {
      Order.prototype.baseSymbol = 'XYZ'
      return expect(osm.create(blockOrderId, params)).to.eventually.be.rejectedWith('No engine available')
    })

    it('creates an authorization for the order', async () => {
      await osm.create(blockOrderId, params)
      expect(relayer.identity.authorize).to.have.been.calledOnce()
    })

    it('creates an order on the relayer', async () => {
      const fakeAuth = 'fake auth'
      const fakeParams = {
        my: 'fake'
      }
      Order.prototype.paramsForCreate = fakeParams
      relayer.identity.authorize.returns(fakeAuth)

      await osm.create(blockOrderId, params)

      expect(relayer.makerService.createOrder).to.have.been.calledOnce()
      expect(relayer.makerService.createOrder).to.have.been.calledWith(fakeParams, fakeAuth)
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
    let placeOrderStub
    let placeOrderStreamStub
    let invoice
    let feePaymentRequest
    let feeRequired
    let depositPaymentRequest
    let depositRequired
    let orderId
    let outboundSymbol

    beforeEach(async () => {
      invoice = '1234'
      payInvoiceStub.resolves(invoice)
      placeOrderStreamStub = {
        on: sinon.stub(),
        removeListener: sinon.stub()
      }
      placeOrderStub = sinon.stub().returns(placeOrderStreamStub)
      feeRequired = true
      feePaymentRequest = 'fee'
      depositRequired = true
      depositPaymentRequest = 'deposit'
      orderId = '1234'
      outboundSymbol = 'BTC'

      fakeOrder = {
        orderId,
        paramsForPlace: {
          feePaymentRequest,
          feeRequired,
          depositPaymentRequest,
          depositRequired,
          orderId,
          outboundSymbol
        }
      }
      engines = new Map([['BTC', 'fakeBtcEngine']])
      relayer = {
        makerService: {
          placeOrder: placeOrderStub
        },
        identity: {
          authorize: sinon.stub()
        }
      }

      osm = new OrderStateMachine({ store, logger, relayer, engines })
      osm.order = fakeOrder

      await osm.goto('created')
    })

    it('throws if no engine is available', () => {
      osm.order.paramsForPlace.outboundSymbol = 'ABC'
      return expect(osm.place()).to.eventually.be.rejectedWith('No engine available')
    })

    it('pays a fee invoice', async () => {
      await osm.place()
      expect(payInvoiceStub).to.have.been.calledWith(engines.get('BTC'), feePaymentRequest)
    })

    it('skips a non-required fee invoice', async () => {
      osm.order.paramsForPlace.feeRequired = false

      await osm.place()
      expect(payInvoiceStub).to.not.have.been.calledWith(engines.get('BTC'), feePaymentRequest)
    })

    it('pays a deposit invoice', async () => {
      await osm.place()
      expect(payInvoiceStub).to.have.been.calledWith(engines.get('BTC'), depositPaymentRequest)
    })

    it('skips a non-required deposit invoice', async () => {
      osm.order.paramsForPlace.depositRequired = false

      await osm.place()
      expect(payInvoiceStub).to.not.have.been.calledWith(engines.get('BTC'), depositPaymentRequest)
    })

    it('creates an authorization for the order', async () => {
      await osm.place()
      expect(relayer.identity.authorize).to.have.been.calledOnce()
    })

    it('places an order on the relayer', async () => {
      const fakeAuth = 'fake auth'
      relayer.identity.authorize.returns(fakeAuth)
      await osm.place()
      expect(placeOrderStub).to.have.been.calledWith(sinon.match({
        feeRefundPaymentRequest: invoice,
        depositRefundPaymentRequest: invoice,
        orderId
      }), fakeAuth)
    })

    it('rejects on error from the relayer place order hook', async () => {
      osm.reject = sinon.stub()
      placeOrderStreamStub.on.withArgs('error').callsArgWithAsync(1, new Error('fake error'))

      await osm.place()

      await delay(10)

      expect(osm.reject).to.have.been.calledOnce()
      expect(osm.reject.args[0][0]).to.be.instanceOf(Error)
      expect(osm.reject.args[0][0]).to.have.property('message', 'fake error')
    })

    it('rejects when the relayer stream closes early', async () => {
      osm.reject = sinon.stub()
      placeOrderStreamStub.on.withArgs('end').callsArgAsync(1)

      await osm.place()

      await delay(10)

      expect(osm.reject).to.have.been.calledOnce()
      expect(osm.reject.args[0][0]).to.be.instanceOf(Error)
      expect(osm.reject.args[0][0]).to.have.property('message')
      expect(osm.reject.args[0][0].message).to.contain('ended early')
    })

    it('cancels the order when the order is in a cancelled state', async () => {
      osm.tryTo = sinon.stub()
      placeOrderStreamStub.on.withArgs('data').callsArgWithAsync(1, { orderStatus: 'CANCELLED' })

      await osm.place()
      await delay(10)

      expect(osm.tryTo).to.have.been.calledOnce()
      expect(osm.tryTo).to.have.been.calledWith('cancel')
    })

    it('sets fill params on the order when it is filled', async () => {
      const swapHash = 'asofijasfd'
      const fillAmount = '1000'
      osm.order.setFilledParams = sinon.stub()
      placeOrderStreamStub.on.withArgs('data').callsArgWithAsync(1, { fill: { swapHash, fillAmount } })
      osm.tryTo = sinon.stub()
      await osm.place()
      await delay(10)

      expect(osm.order.setFilledParams).to.have.been.calledOnce()
      expect(osm.order.setFilledParams).to.have.been.calledWith(sinon.match({ swapHash, fillAmount }))
    })

    it('executes the order after being filled', async () => {
      osm.order.setFilledParams = sinon.stub()
      osm.tryTo = sinon.stub()
      placeOrderStreamStub.on.withArgs('data').callsArgWithAsync(1, { fill: {} })

      await osm.place()
      await delay(10)

      expect(osm.tryTo).to.have.been.calledOnce()
      expect(osm.tryTo).to.have.been.calledWith('execute')
    })

    it('tears down listeners on error', async () => {
      osm.reject = sinon.stub()
      placeOrderStreamStub.on.withArgs('error').callsArgWithAsync(1, new Error('fake error'))

      await osm.place()

      await delay(10)

      expect(placeOrderStreamStub.removeListener).to.have.been.calledThrice()
      expect(placeOrderStreamStub.removeListener).to.have.been.calledWith('error')
      expect(placeOrderStreamStub.removeListener).to.have.been.calledWith('end')
      expect(placeOrderStreamStub.removeListener).to.have.been.calledWith('data')
    })

    it('tears down listeners on early close', async () => {
      osm.reject = sinon.stub()
      placeOrderStreamStub.on.withArgs('end').callsArgAsync(1)

      await osm.place()

      await delay(10)

      expect(placeOrderStreamStub.removeListener).to.have.been.calledThrice()
      expect(placeOrderStreamStub.removeListener).to.have.been.calledWith('error')
      expect(placeOrderStreamStub.removeListener).to.have.been.calledWith('end')
      expect(placeOrderStreamStub.removeListener).to.have.been.calledWith('data')
    })

    it('tears down listeners on complete', async () => {
      osm.reject = sinon.stub()
      placeOrderStreamStub.on.withArgs('data').callsArgWithAsync(1, {})

      await osm.place()

      await delay(10)

      expect(placeOrderStreamStub.removeListener).to.have.been.calledThrice()
      expect(placeOrderStreamStub.removeListener).to.have.been.calledWith('error')
      expect(placeOrderStreamStub.removeListener).to.have.been.calledWith('end')
      expect(placeOrderStreamStub.removeListener).to.have.been.calledWith('data')
    })

    it('tears down listeners on cancel', async () => {
      osm.reject = sinon.stub()
      placeOrderStreamStub.on.withArgs('data').callsArgWithAsync(1, { orderStatus: 'CANCELLED' })

      await osm.place()

      await delay(10)

      expect(placeOrderStreamStub.removeListener).to.have.been.calledThrice()
      expect(placeOrderStreamStub.removeListener).to.have.been.calledWith('error')
      expect(placeOrderStreamStub.removeListener).to.have.been.calledWith('end')
      expect(placeOrderStreamStub.removeListener).to.have.been.calledWith('data')
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
    let inboundFillAmount
    let outboundSymbol
    let outboundFillAmount
    let engine

    beforeEach(async () => {
      executeOrderStub = sinon.stub().resolves()
      prepareSwapStub = sinon.stub().resolves()
      orderId = '1234'
      swapHash = '0q9wudf09asdf'
      inboundSymbol = 'LTC'
      inboundFillAmount = '10000'
      outboundSymbol = 'BTC'
      outboundFillAmount = '100'

      fakeOrder = {
        orderId,
        swapHash,
        inboundFillAmount,
        inboundSymbol,
        outboundSymbol,
        outboundFillAmount,
        paramsForPrepareSwap: {
          orderId,
          swapHash,
          symbol: inboundSymbol,
          amount: inboundFillAmount
        }
      }
      engine = { prepareSwap: prepareSwapStub }
      relayer = {
        makerService: {
          executeOrder: executeOrderStub
        },
        identity: {
          authorize: sinon.stub()
        }
      }

      let engines = new Map([ [inboundSymbol, engine] ])

      osm = new OrderStateMachine({ store, logger, relayer, engines })
      osm.onEnterPlaced = sinon.stub()
      osm.order = fakeOrder
      osm.tryTo = sinon.stub()

      await osm.goto('placed')
    })

    it('prepares the swap on the engine', async () => {
      await osm.execute()

      expect(prepareSwapStub).to.have.been.calledOnce()
      expect(prepareSwapStub).to.have.been.calledWith(orderId, swapHash, inboundFillAmount)
    })

    it('authorizes the request', async () => {
      await osm.execute()

      expect(relayer.identity.authorize).to.have.been.calledOnce()
    })

    it('executes the order on the relayer', async () => {
      const fakeAuth = 'fake auth'
      relayer.identity.authorize.returns(fakeAuth)
      await osm.execute()

      expect(relayer.makerService.executeOrder).to.have.been.calledOnce()
      expect(relayer.makerService.executeOrder).to.have.been.calledWith({ orderId }, fakeAuth)
    })

    it('completes the order after preparing to execute', async () => {
      await osm.execute()
      await delay(5)

      expect(osm.tryTo).to.have.been.calledOnce()
      expect(osm.tryTo).to.have.been.calledWith('complete')
    })
  })

  describe('#complete', () => {
    let fakeOrder
    let osm
    let completeOrderStub
    let getSettledSwapPreimageStub
    let setSettledParams
    let preimage
    let orderId
    let swapHash
    let inboundSymbol
    let engine

    beforeEach(async () => {
      preimage = 'as90fdha9s8hf0a8sfhd=='
      completeOrderStub = sinon.stub().resolves({})
      getSettledSwapPreimageStub = sinon.stub().resolves(preimage)
      orderId = '1234'
      swapHash = '0q9wudf09asdf'
      inboundSymbol = 'LTC'

      setSettledParams = sinon.stub()

      fakeOrder = {
        orderId,
        swapHash,
        inboundSymbol,
        paramsForGetPreimage: {
          swapHash,
          symbol: inboundSymbol
        },
        paramsForComplete: {
          swapPreimage: preimage,
          orderId: orderId
        },
        setSettledParams
      }
      engine = { getSettledSwapPreimage: getSettledSwapPreimageStub }
      relayer = {
        makerService: {
          completeOrder: completeOrderStub
        },
        identity: {
          authorize: sinon.stub()
        }
      }

      let engines = new Map([ [inboundSymbol, engine] ])

      osm = new OrderStateMachine({ store, logger, relayer, engines })
      osm.order = fakeOrder
      osm.tryTo = sinon.stub()

      await osm.goto('executing')
    })

    it('gets the preimage from the engine', async () => {
      await osm.complete()

      expect(getSettledSwapPreimageStub).to.have.been.calledOnce()
      expect(getSettledSwapPreimageStub).to.have.been.calledWith(swapHash)
    })

    it('puts the preimage on the order', async () => {
      await osm.complete()

      expect(setSettledParams).to.have.been.calledOnce()
      expect(setSettledParams).to.have.been.calledWith({ swapPreimage: preimage })
    })

    it('authorizes the request', async () => {
      await osm.complete()

      expect(relayer.identity.authorize).to.have.been.calledOnce()
    })

    it('completes the order on the relayer', async () => {
      const fakeAuth = 'fake auth'
      relayer.identity.authorize.returns(fakeAuth)
      await osm.complete()

      expect(completeOrderStub).to.have.been.calledOnce()
      expect(completeOrderStub).to.have.been.calledWith({ orderId, swapPreimage: preimage }, fakeAuth)
    })
  })

  describe('#goto', () => {
    let osm

    beforeEach(() => {
      osm = new OrderStateMachine({ store, logger, relayer, engines })
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

    beforeEach(async () => {
      osm = new OrderStateMachine({ store, logger, relayer, engines })
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
  })

  describe('#shouldRetry', () => {
    let fakeOrder
    let osm

    beforeEach(() => {
      osm = new OrderStateMachine({ store, logger, relayer, engines })
      const { RELAYER_UNAVAILABLE } = OrderStateMachine.__get__('ORDER_ERROR_CODES')
      fakeOrder = { error: { message: RELAYER_UNAVAILABLE } }
      osm.order = fakeOrder
    })

    it('returns true if the osm error is a relayer error', async () => {
      expect(osm.shouldRetry()).to.be.true()
    })

    it('returns false if there are no errors associated with the fill', async () => {
      osm.order.error = undefined

      expect(osm.shouldRetry()).to.be.false()
    })

    it('returns false if the error code does not match the relayer error code', async () => {
      osm.order.error = { error: { code: 'NOT_RELAYER_ERROR' } }

      expect(osm.shouldRetry()).to.be.false()
    })
  })

  describe('#triggerState', () => {
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
      state = 'executing'
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

    it('attempts to complete the order if it is in an executing state', async () => {
      const osm = await OrderStateMachine.fromStore({ store, logger, relayer, engines }, { key, value })
      osm.triggerComplete = sinon.stub()
      osm.triggerState()

      expect(osm.triggerComplete).to.have.been.calledOnce()
    })

    it('cancels the order if it is in a created state', async () => {
      valueObject.state = 'created'
      value = JSON.stringify(valueObject)
      const osm = await OrderStateMachine.fromStore({ store, logger, relayer, engines }, { key, value })
      osm.tryTo = sinon.stub()
      osm.triggerState()
      await delay(5)

      expect(osm.tryTo).to.have.been.calledOnce()
      expect(osm.tryTo).to.have.been.calledWith('cancel')
    })

    it('cancels the order if in an placed state', async () => {
      valueObject.state = 'placed'
      value = JSON.stringify(valueObject)
      const osm = await OrderStateMachine.fromStore({ store, logger, relayer, engines }, { key, value })
      osm.tryTo = sinon.stub()
      osm.triggerState()
      await delay(5)

      expect(osm.tryTo).to.have.been.calledOnce()
      expect(osm.tryTo).to.have.been.calledWith('cancel')
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
        baseSymbol: 'BTC',
        counterSymbol: 'LTC',
        baseAmount: '100000',
        counterAmount: '1000'
      }
      fakeKey = 'mykey'
      fakeValueObject = {
        my: 'object'
      }
      Order.prototype.baseSymbol = 'BTC'
      Order.prototype.counterSymbol = 'LTC'
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
      const osm = await OrderStateMachine.create({ store, logger, relayer, engines }, blockOrderId, params)

      expect(osm).to.be.instanceOf(OrderStateMachine)
      expect(osm).to.have.property('store', store)
    })

    it('runs a create transition on the state machine', async () => {
      const osm = await OrderStateMachine.create({ store, logger, relayer, engines }, blockOrderId, params)

      expect(osm.state).to.be.equal('created')
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
      const osm = await OrderStateMachine.fromStore({ store, logger, relayer, engines }, { key, value })

      expect(osm).to.be.instanceOf(OrderStateMachine)
      expect(osm).to.have.property('store', store)
    })

    it('moves to the correct state', async () => {
      const osm = await OrderStateMachine.fromStore({ store, logger, relayer, engines }, { key, value })

      expect(osm.state).to.be.equal(state)
    })

    it('contains the old history', async () => {
      history.push('created')
      value = JSON.stringify(valueObject)
      const osm = await OrderStateMachine.fromStore({ store, logger, relayer, engines }, { key, value })

      expect(osm.history).to.be.an('array')
      expect(osm.history).to.have.lengthOf(1)
      expect(osm.history[0]).to.be.eql('created')
    })

    it('does not include the re-inflating in history', async () => {
      const osm = await OrderStateMachine.fromStore({ store, logger, relayer, engines }, { key, value })

      expect(osm.history).to.be.an('array')
      expect(osm.history).to.have.lengthOf(0)
    })

    it('includes saved errors', async () => {
      valueObject.error = 'fakeError'
      value = JSON.stringify(valueObject)

      const osm = await OrderStateMachine.fromStore({ store, logger, relayer, engines }, { key, value })

      expect(osm.error).to.be.an('error')
      expect(osm.error.message).to.be.eql('fakeError')
    })

    it('applies all the saved data', async () => {
      const myObject = 'fakeObject'
      Order.fromObject.returns(myObject)

      const osm = await OrderStateMachine.fromStore({ store, logger, relayer, engines }, { key, value })

      expect(Order.fromObject).to.have.been.calledOnce()
      expect(Order.fromObject).to.have.been.calledWith(key, sinon.match({ my: 'object' }))
      expect(osm.order).to.be.equal(myObject)
    })
  })

  describe('::serialize', () => {
    let orderObject

    beforeEach(() => {
      orderObject = {
        order: {
          serialize: sinon.stub().returns({})
        },
        state: 'COMPLETED',
        dates: {
          'created': '2019-04-19T22:35:12.049Z',
          'placed': '2019-04-19T22:35:12.054Z',
          'executing': '2019-04-19T22:35:44.941Z',
          'completed': '2019-04-19T22:35:45.780Z'
        }
      }
    })

    it('serializes the order', async () => {
      await OrderStateMachine.serialize(orderObject)

      expect(orderObject.order.serialize).to.have.been.called()
    })

    it('returns the serialized order with state and dates', async () => {
      const serializedOrder = await OrderStateMachine.serialize(orderObject)

      expect(serializedOrder).to.have.property('orderStatus', orderObject.state.toUpperCase())
      expect(serializedOrder).to.have.property('dates', orderObject.dates)
      expect(serializedOrder).to.have.property('error', undefined)
    })
  })
})
