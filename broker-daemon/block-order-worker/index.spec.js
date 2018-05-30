const path = require('path')
const bigInt = require('big-integer')
const { expect, rewire, sinon, delay } = require('test/test-helper')

const BlockOrderWorker = rewire(path.resolve(__dirname))

describe('BlockOrderWorker', () => {
  let eventsOn
  let eventsEmit
  let safeid
  let BlockOrder
  let OrderStateMachine

  let orderbooks
  let store
  let logger
  let relayer
  let engine

  let secondLevel

  beforeEach(() => {
    eventsOn = sinon.stub()
    eventsEmit = sinon.stub()
    BlockOrderWorker.prototype.on = eventsOn
    BlockOrderWorker.prototype.emit = eventsEmit

    safeid = sinon.stub()
    BlockOrderWorker.__set__('safeid', safeid)

    BlockOrder = sinon.stub()
    BlockOrder.STATUSES = {
      ACTIVE: 'ACTIVE',
      CANCELLED: 'CANCELLED',
      COMPLETED: 'COMPLETED'
    }
    BlockOrder.fromStorage = sinon.stub()
    BlockOrderWorker.__set__('BlockOrder', BlockOrder)

    OrderStateMachine = sinon.stub()
    OrderStateMachine.create = sinon.stub()
    OrderStateMachine.getAll = sinon.stub()
    BlockOrderWorker.__set__('OrderStateMachine', OrderStateMachine)

    orderbooks = new Map([['BTC/LTC', sinon.stub()]])

    secondLevel = {
      sublevel: sinon.stub()
    }
    store = {
      sublevel: sinon.stub().returns(secondLevel),
      put: sinon.stub().callsArgAsync(2),
      get: sinon.stub()
    }
    logger = {
      info: sinon.stub(),
      error: sinon.stub(),
      debug: sinon.stub()
    }
    relayer = sinon.stub()
    engine = sinon.stub()
  })

  describe('new', () => {
    let worker
    beforeEach(() => {
      worker = new BlockOrderWorker({ orderbooks, store, logger, relayer, engine })
    })

    it('assigns the orderbooks', () => {
      expect(worker).to.have.property('orderbooks', orderbooks)
    })

    it('assigns the store', () => {
      expect(worker).to.have.property('store', store)
    })

    it('assigns the logger', () => {
      expect(worker).to.have.property('logger', logger)
    })

    it('assigns the relayer', () => {
      expect(worker).to.have.property('relayer', relayer)
    })

    it('assigns the engine', () => {
      expect(worker).to.have.property('engine', engine)
    })

    it('works a block order when one is created', async () => {
      const fakeBlockOrder = 'my fake'
      eventsOn.withArgs('BlockOrder:create').callsFake(async (evt, fn) => {
        await delay(10)
        console.log('calling fn')
        fn(fakeBlockOrder)
      })
      worker = new BlockOrderWorker({ orderbooks, store, logger, relayer, engine })
      worker.workBlockOrder = sinon.stub().resolves()

      await delay(15)

      expect(worker.workBlockOrder).to.have.been.calledOnce()
      expect(worker.workBlockOrder).to.have.been.calledWith(fakeBlockOrder)
    })
  })

  describe('createBlockOrder', () => {
    let worker
    beforeEach(() => {
      worker = new BlockOrderWorker({ orderbooks, store, logger, relayer, engine })
    })

    it('throws if the market is not supported', () => {
      const params = {
        marketName: 'ABC/XYZ',
        side: 'BID',
        amount: '10000',
        price: '100',
        timeInForce: 'GTC'
      }
      expect(worker.createBlockOrder(params)).to.be.rejectedWith(Error)
    })

    it('creates an id', async () => {
      const fakeId = 'myfake'
      safeid.returns(fakeId)

      const params = {
        marketName: 'BTC/LTC',
        side: 'BID',
        amount: '10000',
        price: '100',
        timeInForce: 'GTC'
      }
      const id = await worker.createBlockOrder(params)
      expect(id).to.be.eql(fakeId)
    })

    it('creates a block order', async () => {
      const fakeId = 'myfake'
      safeid.returns(fakeId)

      const params = {
        marketName: 'BTC/LTC',
        side: 'BID',
        amount: '10000',
        price: '100',
        timeInForce: 'GTC'
      }
      await worker.createBlockOrder(params)

      expect(BlockOrder).to.have.been.calledOnce()
      expect(BlockOrder).to.have.been.calledWithNew()
      expect(BlockOrder).to.have.been.calledWith({ id: fakeId, status: BlockOrder.STATUSES.ACTIVE, ...params })
    })

    it('saves a block order in the store', async () => {
      const fakeKey = 'mykey'
      const fakeValue = 'myvalue'
      BlockOrder.prototype.key = fakeKey
      BlockOrder.prototype.value = fakeValue

      const params = {
        marketName: 'BTC/LTC',
        side: 'BID',
        amount: '10000',
        price: '100',
        timeInForce: 'GTC'
      }
      await worker.createBlockOrder(params)

      expect(store.put).to.have.been.calledOnce()
      expect(store.put).to.have.been.calledWith(fakeKey, fakeValue)
    })

    it('emits an event to trigger working', async () => {
      const params = {
        marketName: 'BTC/LTC',
        side: 'BID',
        amount: '10000',
        price: '100',
        timeInForce: 'GTC'
      }
      await worker.createBlockOrder(params)

      expect(eventsEmit).to.have.been.calledOnce()
      expect(eventsEmit).to.have.been.calledWith('BlockOrder:create', sinon.match.instanceOf(BlockOrder))
    })
  })

  describe('getBlockOrder', () => {
    let worker
    let blockOrder = JSON.stringify({
      marketName: 'BTC/LTC',
      side: 'BID',
      amount: '100',
      price: '1000'
    })
    let blockOrderId = 'fakeId'
    let orders = [
      {
        id: 'someId'
      }
    ]

    beforeEach(() => {
      store.get.callsArgWithAsync(1, null, blockOrder)
      OrderStateMachine.getAll.resolves(orders)
      BlockOrder.fromStorage.returns({ id: blockOrderId })
      worker = new BlockOrderWorker({ orderbooks, store, logger, relayer, engine })
    })

    it('retrieves a block order from the store', async () => {
      const fakeId = 'myid'
      await worker.getBlockOrder(fakeId)

      expect(store.get).to.have.been.calledOnce()
      expect(store.get).to.have.been.calledWith(fakeId)
    })

    it('inflates the BlockOrder model', async () => {
      const fakeId = 'myid'
      const bO = await worker.getBlockOrder(fakeId)

      expect(BlockOrder.fromStorage).to.have.been.calledOnce()
      expect(BlockOrder.fromStorage).to.have.been.calledWith(fakeId, blockOrder)

      expect(bO).to.be.have.property('id', blockOrderId)
    })

    it('retrieves all open orders associated with a block order', async () => {
      const fakeId = 'myid'
      const fakeStore = 'mystore'
      secondLevel.sublevel.returns(fakeStore)

      const bO = await worker.getBlockOrder(fakeId)

      expect(store.sublevel).to.have.been.calledOnce()
      expect(store.sublevel).to.have.been.calledWith(blockOrderId)
      expect(secondLevel.sublevel).to.have.been.calledOnce()
      expect(secondLevel.sublevel).to.have.been.calledWith('orders')
      expect(OrderStateMachine.getAll).to.have.been.calledOnce()
      expect(OrderStateMachine.getAll).to.have.been.calledWith(sinon.match({ store: fakeStore }))
      expect(bO).to.have.property('openOrders', orders)
    })

    it('throws a not found error if no order exists', async () => {
      const err = new Error('fake error')
      err.notFound = true
      store.get.callsArgWithAsync(1, err)

      expect(worker.getBlockOrder('fakeId')).to.be.rejectedWith(Error)
    })
  })

  describe('workBlockOrder', () => {
    let worker
    let blockOrder
    let order
    beforeEach(() => {
      worker = new BlockOrderWorker({ orderbooks, store, logger, relayer, engine })
      blockOrder = {
        id: 'fakeId',
        marketName: 'BTC/LTC',
        baseSymbol: 'BTC',
        counterSymbol: 'LTC',
        side: 'BID',
        amount: bigInt('100'),
        price: bigInt('1000')
      }
      order = {
        id: 'anotherId'
      }
      OrderStateMachine.create.resolves(order)
    })

    it('errors if the market is not supported', () => {
      blockOrder.marketName = 'ABC/XYC'
      blockOrder.baseSymbol = 'ABC'
      blockOrder.counterSymbol = 'XYZ'

      expect(worker.workBlockOrder(blockOrder)).to.be.rejectedWith(Error)
    })

    it('errors if working a market order', () => {
      blockOrder.price = undefined

      expect(worker.workBlockOrder(blockOrder)).to.be.rejectedWith(Error)
    })

    it('creates an OrderStateMachine', async () => {
      await worker.workBlockOrder(blockOrder)

      expect(OrderStateMachine.create).to.have.been.calledOnce()
    })

    it('provides a sublevel of the block order for the OrderStateMachine', async () => {
      const thirdLevel = 'mylevel'
      secondLevel.sublevel.returns(thirdLevel)

      await worker.workBlockOrder(blockOrder)

      expect(store.sublevel).to.have.been.calledWith(blockOrder.id)
      expect(secondLevel.sublevel).to.have.been.calledWith('orders')
      expect(OrderStateMachine.create).to.have.been.calledWith(sinon.match({ store: thirdLevel }))
    })

    it('provides the relayer to the OrderStateMachine', async () => {
      await worker.workBlockOrder(blockOrder)

      expect(OrderStateMachine.create).to.have.been.calledWith(sinon.match({ relayer }))
    })

    it('provides the engine to the OrderStateMachine', async () => {
      await worker.workBlockOrder(blockOrder)

      expect(OrderStateMachine.create).to.have.been.calledWith(sinon.match({ engine }))
    })

    // NOTE: other testing is TODO until workBlockOrder supports more sophisticated order handling
  })
})
