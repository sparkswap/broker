const path = require('path')
const { expect, rewire, sinon } = require('test/test-helper')

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
      put: sinon.stub()
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
      info: {
        publicKey: sinon.stub()
      }
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
      const osm = new OrderStateMachine({ store, logger, relayer, engine })

      return expect(store.put).to.not.have.been.called
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
      engine.info.publicKey.resolves(fakeKey)

      await osm.create(params)

      expect(engine.info.publicKey).to.have.been.calledOnce()
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
      expect(store.put).to.have.been.calledWith(fakeKey, sinon.match(fakeValueObject))
    })

    it('saves the current state in the store', async () => {
      await osm.create(params)

      expect(store.put).to.have.been.calledOnce()
      expect(store.put).to.have.been.calledWith(fakeKey, sinon.match({ __state: 'created' }))
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
      expect(store.put).to.have.been.calledWith(fakeKey, sinon.match({ __state: 'created' }))
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
