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
      expect(store.put).to.have.been.calledWith(fakeKey, sinon.match('"state":"created"'))
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
      expect(store.put).to.have.been.calledWith(osm.order.key, sinon.match('"state":"rejected"'))
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
