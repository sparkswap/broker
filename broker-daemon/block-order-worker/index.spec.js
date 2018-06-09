const path = require('path')
const { Big } = require('../utils')
const { expect, rewire, sinon, delay } = require('test/test-helper')

const BlockOrderWorker = rewire(path.resolve(__dirname))

describe('BlockOrderWorker', () => {
  let eventsOn
  let eventsEmit
  let safeid
  let BlockOrder
  let OrderStateMachine
  let FillStateMachine

  let orderbooks
  let store
  let logger
  let relayer
  let engine

  let secondLevel
  let thirdLevel

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
      COMPLETED: 'COMPLETED',
      FAILED: 'FAILED'
    }
    BlockOrder.fromStorage = sinon.stub()
    BlockOrderWorker.__set__('BlockOrder', BlockOrder)

    OrderStateMachine = sinon.stub()
    OrderStateMachine.create = sinon.stub()
    OrderStateMachine.getAll = sinon.stub()

    FillStateMachine = sinon.stub()
    FillStateMachine.create = sinon.stub()
    FillStateMachine.getAll = sinon.stub()

    BlockOrderWorker.__set__('OrderStateMachine', OrderStateMachine)
    BlockOrderWorker.__set__('FillStateMachine', FillStateMachine)

    orderbooks = new Map([['BTC/LTC', {
      getBestOrders: sinon.stub()
    }]])

    thirdLevel = {
      put: sinon.stub()
    }
    secondLevel = {
      sublevel: sinon.stub().returns(thirdLevel)
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
        fn(fakeBlockOrder)
      })
      worker = new BlockOrderWorker({ orderbooks, store, logger, relayer, engine })
      worker.workBlockOrder = sinon.stub().resolves()

      await delay(15)

      expect(worker.workBlockOrder).to.have.been.calledOnce()
      expect(worker.workBlockOrder).to.have.been.calledWith(fakeBlockOrder)
    })

    it('fails a block order if working it fails', async () => {
      const fakeErr = new Error('fake')
      const fakeBlockOrder = {
        id: 'my fake'
      }
      eventsOn.withArgs('BlockOrder:create').callsFake(async (evt, fn) => {
        await delay(10)
        fn(fakeBlockOrder)
      })
      worker = new BlockOrderWorker({ orderbooks, store, logger, relayer, engine })
      worker.workBlockOrder = sinon.stub().throws(fakeErr)
      worker.failBlockOrder = sinon.stub()

      await delay(15)

      expect(worker.failBlockOrder).to.have.been.calledOnce()
      expect(worker.failBlockOrder).to.have.been.calledWith(fakeBlockOrder.id, fakeErr)
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
      expect(BlockOrder).to.have.been.calledWith({ id: fakeId, ...params })
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

  describe('failBlockOrder', () => {
    let worker
    let blockOrder = JSON.stringify({
      marketName: 'BTC/LTC',
      side: 'BID',
      amount: '100',
      price: '1000'
    })
    let blockOrderId = 'fakeId'
    let fakeBlockOrder
    let orders = [
      {
        id: 'someId'
      }
    ]
    let fakeErr
    let fakeId

    beforeEach(() => {
      store.get.callsArgWithAsync(1, null, blockOrder)
      store.put.callsArgAsync(2)
      OrderStateMachine.getAll.resolves(orders)

      fakeBlockOrder = {
        id: blockOrderId,
        key: 'fakeVal',
        value: 'fakeVal',
        fail: sinon.stub()
      }

      BlockOrder.fromStorage.returns(fakeBlockOrder)
      worker = new BlockOrderWorker({ orderbooks, store, logger, relayer, engine })
      fakeErr = new Error('fake')
      fakeId = 'myid'
    })

    it('retrieves a block order from the store', async () => {
      await worker.failBlockOrder(fakeId, fakeErr)

      expect(store.get).to.have.been.calledOnce()
      expect(store.get).to.have.been.calledWith(fakeId)
    })

    it('inflates the BlockOrder model', async () => {
      await worker.failBlockOrder(fakeId, fakeErr)

      expect(BlockOrder.fromStorage).to.have.been.calledOnce()
      expect(BlockOrder.fromStorage).to.have.been.calledWith(fakeId, blockOrder)
    })

    it('updates the block order to failed status', async () => {
      await worker.failBlockOrder(fakeId, fakeErr)

      expect(fakeBlockOrder.fail).to.have.been.calledOnce()
    })

    it('saves the updated block order', async () => {
      await worker.failBlockOrder(fakeId, fakeErr)

      expect(store.put).to.have.been.calledOnce()
      expect(store.put).to.have.been.calledWith(fakeBlockOrder.key, fakeBlockOrder.value)
    })

    it('emits a failed status event', async () => {
      worker.emit = sinon.stub()
      await worker.failBlockOrder(fakeId, fakeErr)

      expect(worker.emit).to.have.been.calledOnce()
      expect(worker.emit).to.have.been.calledWith('BlockOrder:fail', sinon.match({ id: blockOrderId }))
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
      const BlockOrderNotFoundError = BlockOrderWorker.__get__('BlockOrderNotFoundError')

      const err = new Error('fake error')
      err.notFound = true
      store.get.callsArgWithAsync(1, err)

      return expect(worker.getBlockOrder('fakeId')).to.eventually.be.rejectedWith(BlockOrderNotFoundError)
    })
  })

  describe('#workBlockOrder', () => {
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
        amount: Big('100'),
        price: Big('1000')
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

    it('sends market orders to #workMarketBlockOrder', async () => {
      blockOrder.price = null
      worker.workMarketBlockOrder = sinon.stub().resolves()

      await worker.workBlockOrder(blockOrder)

      expect(worker.workMarketBlockOrder).to.have.been.calledOnce()
      expect(worker.workMarketBlockOrder).to.have.been.calledWith(blockOrder)
    })

    it('sends limit orders to #workLimitBlockOrder', async () => {
      worker.workLimitBlockOrder = sinon.stub().resolves()

      await worker.workBlockOrder(blockOrder)

      expect(worker.workLimitBlockOrder).to.have.been.calledOnce()
      expect(worker.workLimitBlockOrder).to.have.been.calledWith(blockOrder)
    })
  })

  describe('#workLimitBlockOrder', () => {
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
        amount: Big('100'),
        price: Big('1000')
      }
      order = {
        id: 'anotherId'
      }
      OrderStateMachine.create.resolves(order)
    })

    it('creates an OrderStateMachine', async () => {
      await worker.workLimitBlockOrder(blockOrder)

      expect(OrderStateMachine.create).to.have.been.calledOnce()
    })

    it('provides a sublevel of the block order for the OrderStateMachine', async () => {
      await worker.workLimitBlockOrder(blockOrder)

      expect(store.sublevel).to.have.been.calledWith(blockOrder.id)
      expect(secondLevel.sublevel).to.have.been.calledWith('orders')
      expect(OrderStateMachine.create).to.have.been.calledWith(sinon.match({ store: thirdLevel }))
    })

    it('provides the relayer to the OrderStateMachine', async () => {
      await worker.workLimitBlockOrder(blockOrder)

      expect(OrderStateMachine.create).to.have.been.calledWith(sinon.match({ relayer }))
    })

    it('provides the engine to the OrderStateMachine', async () => {
      await worker.workLimitBlockOrder(blockOrder)

      expect(OrderStateMachine.create).to.have.been.calledWith(sinon.match({ engine }))
    })

    it('provides a handler for onRejection', async () => {
      await worker.workLimitBlockOrder(blockOrder)

      expect(OrderStateMachine.create).to.have.been.calledWith(sinon.match({ onRejection: sinon.match.func }))
    })

    it('fails the block order if the order is rejected', async () => {
      worker.failBlockOrder = sinon.stub()
      await worker.workLimitBlockOrder(blockOrder)

      const { onRejection } = OrderStateMachine.create.args[0][0]

      const err = new Error('fale')
      onRejection(err)

      await delay(10)

      expect(worker.failBlockOrder).to.have.been.calledOnce()
      expect(worker.failBlockOrder).to.have.been.calledWith(blockOrder.id, err)
    })

    // NOTE: other testing is TODO until workBlockOrder supports more sophisticated order handling
  })

  describe('#workMarketBlockOrder', () => {
    let worker
    let blockOrder
    let fill
    let orders

    beforeEach(() => {
      worker = new BlockOrderWorker({ orderbooks, store, logger, relayer, engine })
      blockOrder = {
        id: 'fakeId',
        marketName: 'BTC/LTC',
        baseSymbol: 'BTC',
        counterSymbol: 'LTC',
        side: 'BID',
        inverseSide: 'ASK',
        amount: Big('100'),
        price: null
      }
      fill = {
        id: 'anotherId'
      }
      FillStateMachine.create.resolves(fill)
      orders = [
        { orderId: '1', baseAmount: '90' },
        { orderId: '2', baseAmount: '100' }
      ]

      orderbooks.get('BTC/LTC').getBestOrders.resolves(orders)
    })

    it('gets the best orders from the orderbook', async () => {
      await worker.workMarketBlockOrder(blockOrder)

      expect(orderbooks.get('BTC/LTC').getBestOrders).to.have.been.calledOnce()
      expect(orderbooks.get('BTC/LTC').getBestOrders).to.have.been.calledWith(sinon.match({ side: 'ASK', depth: '100' }))
    })

    it('creates FillStateMachines for each fill', async () => {
      await worker.workMarketBlockOrder(blockOrder)

      expect(FillStateMachine.create).to.have.been.calledTwice()
      expect(FillStateMachine.create).to.have.been.calledWith(sinon.match.any, orders[0])
      expect(FillStateMachine.create).to.have.been.calledWith(sinon.match.any, orders[1])
    })

    it('provides the full fill amount for orders before the last', async () => {
      await worker.workMarketBlockOrder(blockOrder)

      const call = FillStateMachine.create.args[0]

      expect(call[2]).to.eql({ fillAmount: orders[0].baseAmount })
    })

    it('provides the remaining fill amount for the last order', async () => {
      await worker.workMarketBlockOrder(blockOrder)

      const call = FillStateMachine.create.args[1]

      expect(call[2]).to.eql({ fillAmount: '10' })
    })

    it('provides a sublevel of the block order for the FillStateMachine', async () => {
      const thirdLevel = 'mylevel'
      secondLevel.sublevel.returns(thirdLevel)

      await worker.workMarketBlockOrder(blockOrder)

      expect(store.sublevel).to.have.been.calledWith(blockOrder.id)
      expect(secondLevel.sublevel).to.have.been.calledWith('fills')
      expect(FillStateMachine.create).to.have.been.calledWith(sinon.match({ store: thirdLevel }))
    })

    it('provides the relayer to the FillStateMachine', async () => {
      await worker.workMarketBlockOrder(blockOrder)

      expect(FillStateMachine.create).to.have.been.calledWith(sinon.match({ relayer }))
    })

    it('provides the engine to the FillStateMachine', async () => {
      await worker.workMarketBlockOrder(blockOrder)

      expect(FillStateMachine.create).to.have.been.calledWith(sinon.match({ engine }))
    })

    it('provides a handler for onRejection', async () => {
      await worker.workMarketBlockOrder(blockOrder)

      expect(FillStateMachine.create).to.have.been.calledWith(sinon.match({ onRejection: sinon.match.func }))
    })

    it('fails the block order if the order is rejected', async () => {
      worker.failBlockOrder = sinon.stub()
      await worker.workMarketBlockOrder(blockOrder)

      const { onRejection } = FillStateMachine.create.args[0][0]

      const err = new Error('fale')
      onRejection(err)

      await delay(10)

      expect(worker.failBlockOrder).to.have.been.calledOnce()
      expect(worker.failBlockOrder).to.have.been.calledWith(blockOrder.id, err)
    })
  })
})
