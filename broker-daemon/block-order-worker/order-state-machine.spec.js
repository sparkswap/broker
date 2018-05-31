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
      createOrder: sinon.stub()
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

  describe('#nextTransition', () => {
    let osm

    beforeEach(() => {
      osm = new OrderStateMachine({ store, logger, relayer, engine })
      osm.goto('created')
    })

    it('transitions on next tick', () => {
      osm.place = sinon.stub()
      const state = osm.state
      osm.nextTransition('place')

      expect(osm.state).to.be.eql(state)
    })

    it('calls the transition', async () => {
      osm.place = sinon.stub()

      osm.nextTransition('place')

      await delay(10)

      expect(osm.place).to.have.been.calledOnce()
    })

    it('passes through arguments', async () => {
      osm.place = sinon.stub()

      osm.nextTransition('place', 'hello', 'world')

      await delay(10)

      expect(osm.place).to.have.been.calledOnce()
      expect(osm.place).to.have.been.calledWith('hello', 'world')
    })

    it('rejects on error', async () => {
      const fakeError = new Error('my error')

      osm.place = sinon.stub().rejects(fakeError)
      osm.reject = sinon.stub()

      osm.nextTransition('place')

      await delay(10)

      expect(osm.reject).to.have.been.calledOnce()
      expect(osm.reject).to.have.been.calledWith(fakeError)
    })

    it('moves to rejected if using an invalid transition', async () => {
      osm.reject = sinon.stub()

      osm.nextTransition('blergh')

      await delay(10)

      expect(osm.reject).to.have.been.calledOnce()
    })
  })

  describe('#create', () => {
    let osm
    let params
    let addCreatedParams
    let fakeKey
    let fakeValueObject
    beforeEach(() => {
      fakeKey = 'mykey'
      fakeValueObject = {
        my: 'object'
      }
      Order.prototype.key = fakeKey
      Order.prototype.valueObject = fakeValueObject
      addCreatedParams = sinon.stub()
      Order.prototype.addCreatedParams = addCreatedParams
      relayer.createOrder.resolves()
      osm = new OrderStateMachine({ store, logger, relayer, engine })
      params = {
        side: 'BID',
        baseSymbol: 'ABC',
        counterSymbol: 'XYZ',
        baseAmount: '100000',
        counterAmount: '1000'
      }
    })

    it('creates an order model', async () => {
      await osm.create(params)

      expect(Order).to.have.been.calledOnce()
      expect(Order).to.have.been.calledWithNew()
      expect(osm).to.have.property('order')
      expect(osm.order).to.be.instanceOf(Order)
    })

    it('passes the params to the order model', async () => {
      await osm.create(params)

      expect(Order).to.have.been.calledWith(sinon.match(params))
    })

    it('creates a payTo for the order', async () => {
      const fakeKey = 'mykey'
      engine.getPublicKey.resolves(fakeKey)

      await osm.create(params)

      expect(engine.getPublicKey).to.have.been.calledOnce()
      expect(Order).to.have.been.calledWith(sinon.match({ payTo: `ln:${fakeKey}` }))
    })

    xit('creates an ownerId for the order')

    it('creates an order on the relayer', async () => {
      const fakeParams = {
        my: 'fake'
      }
      Order.prototype.createParams = fakeParams

      await osm.create(params)

      expect(relayer.createOrder).to.have.been.calledOnce()
      expect(relayer.createOrder).to.have.been.calledWith(fakeParams)
    })

    it('updates the order with returned params', async () => {
      const fakeResponse = 'myresponse'
      relayer.createOrder.resolves(fakeResponse)

      await osm.create(params)

      expect(addCreatedParams).to.have.been.calledOnce()
      expect(addCreatedParams).to.have.been.calledWith(fakeResponse)
    })

    it('saves a copy in the store', async () => {
      await osm.create(params)

      expect(store.put).to.have.been.calledOnce()
      expect(store.put).to.have.been.calledWith(fakeKey, sinon.match('"my":"object"'))
    })

    it('saves the current state in the store', async () => {
      await osm.create(params)

      expect(store.put).to.have.been.calledOnce()
      expect(store.put).to.have.been.calledWith(fakeKey, sinon.match('"__state":"created"'))
    })

    it('throws an error in creation on the relayer fails', () => {
      relayer.createOrder.rejects(new Error('fake error'))

      return expect(osm.create(params)).to.be.rejectedWith(Error)
    })

    it('cancels the transition if the creation on the relayer fails', async () => {
      relayer.createOrder.rejects()

      try {
        await osm.create(params)
      } catch (e) {
        expect(osm.state).to.be.equal('none')
      }
    })

    it('does not save a copy if creation on the relayer fails', async () => {
      relayer.createOrder.rejects()

      try {
        await osm.create(params)
      } catch (e) {
        return expect(store.put).to.not.have.been.called
      }
    })

    it('automatically attempts to place an order after creation', async () => {
      osm.nextTransition = sinon.stub()
      await osm.create(params)

      await delay(10)
      expect(osm.nextTransition).to.have.been.calledOnce()
      expect(osm.nextTransition).to.have.been.calledWith('place')
    })
  })

  describe('#place', () => {
    let osm

    beforeEach(async () => {
      osm = new OrderStateMachine({ store, logger, relayer, engine })
      await osm.goto('created')
    })

    it('throws while unimplemented', () => {
      return expect(osm.place()).to.eventually.be.rejectedWith(Error)
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

    beforeEach(async () => {
      osm = new OrderStateMachine({ store, logger, relayer, engine })
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
      expect(store.put).to.have.been.calledWith(osm.order.key, sinon.match('"__state":"rejected"'))
    })
  })

  describe('::create', () => {
    let params
    let fakeKey
    let fakeValueObject
    let addCreatedParams

    beforeEach(() => {
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
      addCreatedParams = sinon.stub()
      Order.prototype.addCreatedParams = addCreatedParams
    })

    it('initializes a state machine', async () => {
      const osm = await OrderStateMachine.create({ store, logger, relayer, engine }, params)

      expect(osm).to.be.instanceOf(OrderStateMachine)
      expect(osm).to.have.property('store', store)
    })

    it('runs a create transition on the state machine', async () => {
      const osm = await OrderStateMachine.create({ store, logger, relayer, engine }, params)

      expect(osm.state).to.be.equal('created')
      expect(store.put).to.have.been.calledOnce()
      expect(store.put).to.have.been.calledWith(fakeKey, sinon.match('"__state":"created"'))
    })
  })

  describe('::getAll', () => {
    let getRecords
    let fakeRecords
    let fakeOrder
    let state
    let store
    let logger

    beforeEach(() => {
      state = 'created'

      fakeRecords = [ ['fakeKey', JSON.stringify({
        my: 'object',
        __state: state
      })] ]
      getRecords = sinon.stub().callsFake((store, eachRecord) => {
        return new Promise((resolve, reject) => {
          resolve(fakeRecords.map(([ key, val ]) => eachRecord(key, val)))
        })
      })

      OrderStateMachine.__set__('getRecords', getRecords)

      store = {
        put: sinon.stub()
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

      expect(getRecords).to.have.been.calledOnce()
      expect(getRecords).to.have.been.calledWith(store)
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
    let value

    beforeEach(() => {
      Order.fromObject = sinon.stub()
      key = 'fakeKey'
      state = 'created'
      value = JSON.stringify({
        my: 'object',
        __state: state
      })
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
