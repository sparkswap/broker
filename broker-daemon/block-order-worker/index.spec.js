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
    BlockOrder.TIME_RESTRICTIONS = {
      GTC: 'GTC'
    }
    BlockOrder.fromStorage = sinon.stub()
    BlockOrderWorker.__set__('BlockOrder', BlockOrder)

    OrderStateMachine = sinon.stub()
    OrderStateMachine.create = sinon.stub()
    OrderStateMachine.getAll = sinon.stub()
    OrderStateMachine.STATES = {
      NONE: 'none',
      CREATED: 'created',
      PLACED: 'placed',
      CANCELLED: 'cancelled'
    }

    FillStateMachine = sinon.stub()
    FillStateMachine.create = sinon.stub()
    FillStateMachine.getAll = sinon.stub()
    FillStateMachine.STATES = {
      NONE: 'none',
      CREATED: 'created',
      FILLED: 'filled'
    }

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
    let fills = [
      {
        id: 'anotherid'
      }
    ]

    beforeEach(() => {
      store.get.callsArgWithAsync(1, null, blockOrder)
      OrderStateMachine.getAll.resolves(orders)
      FillStateMachine.getAll.resolves(fills)
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

      expect(store.sublevel).to.have.been.calledTwice()
      expect(store.sublevel).to.have.been.calledWith(blockOrderId)
      expect(secondLevel.sublevel).to.have.been.calledTwice()
      expect(secondLevel.sublevel).to.have.been.calledWith('orders')
      expect(OrderStateMachine.getAll).to.have.been.calledOnce()
      expect(OrderStateMachine.getAll).to.have.been.calledWith(sinon.match({ store: fakeStore }))
      expect(bO).to.have.property('openOrders', orders)
    })

    it('retrieves all fills associated with a block order', async () => {
      const fakeId = 'myid'
      const fakeStore = 'mystore'
      secondLevel.sublevel.returns(fakeStore)

      const bO = await worker.getBlockOrder(fakeId)

      expect(store.sublevel).to.have.been.calledTwice()
      expect(store.sublevel).to.have.been.calledWith(blockOrderId)
      expect(secondLevel.sublevel).to.have.been.calledTwice()
      expect(secondLevel.sublevel).to.have.been.calledWith('fills')
      expect(FillStateMachine.getAll).to.have.been.calledOnce()
      expect(FillStateMachine.getAll).to.have.been.calledWith(sinon.match({ store: fakeStore }))
      expect(bO).to.have.property('fills', fills)
    })

    it('throws a not found error if no order exists', async () => {
      const BlockOrderNotFoundError = BlockOrderWorker.__get__('BlockOrderNotFoundError')

      const err = new Error('fake error')
      err.notFound = true
      store.get.callsArgWithAsync(1, err)

      return expect(worker.getBlockOrder('fakeId')).to.eventually.be.rejectedWith(BlockOrderNotFoundError)
    })
  })

  describe('#cancelBlockOrder', () => {
    let worker
    let blockOrder = JSON.stringify({
      marketName: 'BTC/LTC',
      side: 'BID',
      amount: '100',
      price: '1000'
    })
    let blockOrderId = 'fakeId'
    let blockOrderCancel
    let blockOrderKey = blockOrderId
    let blockOrderValue = blockOrder
    let orders
    let getRecords
    let OrderFromObject

    beforeEach(() => {
      orders = [
        {
          order: {
            orderId: 'someId'
          },
          state: 'created'
        }
      ]
      store.get.callsArgWithAsync(1, null, blockOrder)
      blockOrderCancel = sinon.stub()
      BlockOrder.fromStorage.returns({
        id: blockOrderId,
        cancel: blockOrderCancel,
        key: blockOrderKey,
        value: blockOrderValue
      })
      getRecords = sinon.stub().resolves(orders)
      OrderFromObject = sinon.stub()

      BlockOrderWorker.__set__('getRecords', getRecords)
      BlockOrderWorker.__set__('Order', {
        fromObject: OrderFromObject
      })

      relayer.makerService = {
        cancelOrder: sinon.stub().resolves()
      }

      worker = new BlockOrderWorker({ orderbooks, store, logger, relayer, engine })
    })

    it('retrieves a block order from the store', async () => {
      const fakeId = 'myid'
      await worker.cancelBlockOrder(fakeId)

      expect(store.get).to.have.been.calledOnce()
      expect(store.get).to.have.been.calledWith(fakeId)
    })

    it('inflates the BlockOrder model', async () => {
      const fakeId = 'myid'
      const bO = await worker.cancelBlockOrder(fakeId)

      expect(BlockOrder.fromStorage).to.have.been.calledOnce()
      expect(BlockOrder.fromStorage).to.have.been.calledWith(fakeId, blockOrder)

      expect(bO).to.be.have.property('id', blockOrderId)
    })

    it('retrieves all orders associated with a block order', async () => {
      const fakeId = 'myid'
      const fakeStore = 'mystore'
      secondLevel.sublevel.returns(fakeStore)

      await worker.cancelBlockOrder(fakeId)

      expect(store.sublevel).to.have.been.calledOnce()
      expect(store.sublevel).to.have.been.calledWith(blockOrderId)
      expect(secondLevel.sublevel).to.have.been.calledOnce()
      expect(secondLevel.sublevel).to.have.been.calledWith('orders')
      expect(getRecords).to.have.been.calledOnce()
      expect(getRecords).to.have.been.calledWith(fakeStore)
    })

    it('inflates order models for all of the order records', async () => {
      const fakeId = 'myid'

      await worker.cancelBlockOrder(fakeId)

      const eachRecord = getRecords.args[0][1]

      const fakeKey = 'mykey'
      const fakeValue = { my: 'value' }
      const fakeState = 'created'
      const fakeValueStr = JSON.stringify({ state: fakeState, order: fakeValue })
      const fakeOrder = 'my order'

      OrderFromObject.returns(fakeOrder)

      expect(eachRecord(fakeKey, fakeValueStr)).to.be.eql({ state: fakeState, order: fakeOrder })
      expect(OrderFromObject).to.have.been.calledOnce()
      expect(OrderFromObject).to.have.been.calledWith(fakeKey, sinon.match(fakeValue))
    })

    it('cancels all of the orders on the relayer', async () => {
      const fakeId = 'myid'

      await worker.cancelBlockOrder(fakeId)

      expect(relayer.makerService.cancelOrder).to.have.been.calledOnce()
      expect(relayer.makerService.cancelOrder).to.have.been.calledWith(sinon.match({ orderId: orders[0].order.orderId }))
    })

    it('filters out orders not in a placed or created state', async () => {
      const fakeId = 'myid'

      orders.push({ order: { orderId: 'hello' }, state: 'rejected' })
      orders.push({ order: { orderId: 'darkness' }, state: 'cancelled' })
      orders.push({ order: { orderId: 'my old' }, state: 'filled' })
      orders.push({ order: { orderId: 'friend' }, state: 'none' })

      await worker.cancelBlockOrder(fakeId)
      expect(relayer.makerService.cancelOrder).to.have.been.calledOnce()
      expect(relayer.makerService.cancelOrder).to.have.been.calledWith(sinon.match({ orderId: orders[0].order.orderId }))
    })

    it('updates the block order to failed status', async () => {
      const fakeId = 'myid'
      await worker.cancelBlockOrder(fakeId)

      expect(blockOrderCancel).to.have.been.calledOnce()
    })

    it('saves the updated block order', async () => {
      const fakeId = 'myid'
      await worker.cancelBlockOrder(fakeId)

      expect(store.put).to.have.been.calledOnce()
      expect(store.put).to.have.been.calledWith(blockOrderKey, blockOrderValue)
    })

    it('emits a failed status event', async () => {
      const fakeId = 'myid'
      worker.emit = sinon.stub()
      await worker.cancelBlockOrder(fakeId)

      expect(worker.emit).to.have.been.calledOnce()
      expect(worker.emit).to.have.been.calledWith('BlockOrder:cancel', sinon.match({ id: blockOrderId }))
    })

    it('throws a not found error if no order exists', async () => {
      const BlockOrderNotFoundError = BlockOrderWorker.__get__('BlockOrderNotFoundError')

      const err = new Error('fake error')
      err.notFound = true
      store.get.callsArgWithAsync(1, err)

      return expect(worker.cancelBlockOrder('fakeId')).to.eventually.be.rejectedWith(BlockOrderNotFoundError)
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
    let orders

    beforeEach(() => {
      worker = new BlockOrderWorker({ orderbooks, store, logger, relayer, engine })
      worker._fillOrders = sinon.stub()
      worker._placeOrder = sinon.stub()
      blockOrder = {
        id: 'fakeId',
        marketName: 'BTC/LTC',
        baseSymbol: 'BTC',
        counterSymbol: 'LTC',
        side: 'BID',
        inverseSide: 'ASK',
        amount: Big('100'),
        baseAmount: '100.000000000000',
        price: Big('1000'),
        timeInForce: 'GTC'
      }
      order = {
        id: 'anotherId'
      }
      OrderStateMachine.create.resolves(order)

      orders = [
        { orderId: '1', baseAmount: '90' }
      ]

      orderbooks.get('BTC/LTC').getBestOrders.resolves({
        orders,
        depth: '90'
      })
    })

    it('gets the best orders from the orderbook', async () => {
      await worker.workLimitBlockOrder(blockOrder)

      expect(orderbooks.get('BTC/LTC').getBestOrders).to.have.been.calledOnce()
      expect(orderbooks.get('BTC/LTC').getBestOrders).to.have.been.calledWith(sinon.match({ side: 'ASK', depth: '100', quantumPrice: '1000' }))
    })

    it('fills as many orders as possible at the given price or better', async () => {
      await worker.workLimitBlockOrder(blockOrder)

      expect(worker._fillOrders).to.have.been.calledOnce()
      expect(worker._fillOrders.args[0][0]).to.be.eql(blockOrder)
      expect(worker._fillOrders.args[0][1]).to.be.eql(orders)
      expect(worker._fillOrders.args[0][2]).to.be.eql('100')
    })

    it('places an order for the remaining amount', async () => {
      await worker.workLimitBlockOrder(blockOrder)

      expect(worker._placeOrder).to.have.been.calledOnce()
      expect(worker._placeOrder.args[0][0]).to.be.eql(blockOrder)
      expect(worker._placeOrder.args[0][1]).to.be.eql('10')
    })

    it('does not place an order if it can be filled with fills only', async () => {
      orders.push({ orderId: '1', baseAmount: '100' })
      orderbooks.get('BTC/LTC').getBestOrders.resolves({
        orders,
        depth: '190'
      })

      await worker.workLimitBlockOrder(blockOrder)

      expect(worker._fillOrders.args[0][1]).to.have.lengthOf(2)
      expect(worker._placeOrder).to.not.have.been.called()
    })
    // NOTE: other testing is TODO until workBlockOrder supports more sophisticated order handling
  })

  describe('#workMarketBlockOrder', () => {
    let worker
    let blockOrder
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

      worker._fillOrders = sinon.stub()

      orders = [
        { orderId: '1', baseAmount: '90' },
        { orderId: '2', baseAmount: '100' }
      ]

      orderbooks.get('BTC/LTC').getBestOrders.resolves({
        orders,
        depth: '190'
      })
    })

    it('gets the best orders from the orderbook', async () => {
      await worker.workMarketBlockOrder(blockOrder)

      expect(orderbooks.get('BTC/LTC').getBestOrders).to.have.been.calledOnce()
      expect(orderbooks.get('BTC/LTC').getBestOrders).to.have.been.calledWith(sinon.match({ side: 'ASK', depth: '100' }))
    })

    it('throws if insufficient depth is in the market', () => {
      orderbooks.get('BTC/LTC').getBestOrders.resolves({
        orders: [],
        depth: '0'
      })

      return expect(worker.workMarketBlockOrder(blockOrder)).to.eventually.rejectedWith('Insufficient depth in ASK to fill 100')
    })

    it('fills the orders to the given depth', async () => {
      await worker.workMarketBlockOrder(blockOrder)

      expect(worker._fillOrders).to.have.been.calledOnce()
      expect(worker._fillOrders.args[0][0]).to.be.eql(blockOrder)
      expect(worker._fillOrders.args[0][1]).to.be.eql(orders)
      expect(worker._fillOrders.args[0][2]).to.be.eql('100')
    })
  })

  describe('#_fillOrders', () => {
    let worker
    let blockOrder
    let fill
    let orders
    let targetDepth

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
      targetDepth = '100'
    })

    it('creates FillStateMachines for each fill', async () => {
      await worker._fillOrders(blockOrder, orders, targetDepth)

      expect(FillStateMachine.create).to.have.been.calledTwice()
      expect(FillStateMachine.create).to.have.been.calledWith(sinon.match.any, orders[0])
      expect(FillStateMachine.create).to.have.been.calledWith(sinon.match.any, orders[1])
    })

    it('provides the full fill amount for orders before the last', async () => {
      await worker._fillOrders(blockOrder, orders, targetDepth)

      const call = FillStateMachine.create.args[0]

      expect(call[2]).to.eql({ fillAmount: orders[0].baseAmount })
    })

    it('provides the remaining fill amount for the last order', async () => {
      await worker._fillOrders(blockOrder, orders, targetDepth)

      const call = FillStateMachine.create.args[1]

      expect(call[2]).to.eql({ fillAmount: '10' })
    })

    it('stops filling early if it fills the target depth', async () => {
      orders.push({ orderId: '3', baseAmount: '100' })

      await worker._fillOrders(blockOrder, orders, targetDepth)

      expect(FillStateMachine.create).to.have.been.calledTwice()
    })

    it('provides a sublevel of the block order for the FillStateMachine', async () => {
      const thirdLevel = 'mylevel'
      secondLevel.sublevel.returns(thirdLevel)

      await worker._fillOrders(blockOrder, orders, targetDepth)

      expect(store.sublevel).to.have.been.calledWith(blockOrder.id)
      expect(secondLevel.sublevel).to.have.been.calledWith('fills')
      expect(FillStateMachine.create).to.have.been.calledWith(sinon.match({ store: thirdLevel }))
    })

    it('provides the relayer to the FillStateMachine', async () => {
      await worker._fillOrders(blockOrder, orders, targetDepth)

      expect(FillStateMachine.create).to.have.been.calledWith(sinon.match({ relayer }))
    })

    it('provides the engine to the FillStateMachine', async () => {
      await worker._fillOrders(blockOrder, orders, targetDepth)

      expect(FillStateMachine.create).to.have.been.calledWith(sinon.match({ engine }))
    })

    it('provides a handler for onRejection', async () => {
      await worker._fillOrders(blockOrder, orders, targetDepth)

      expect(FillStateMachine.create).to.have.been.calledWith(sinon.match({ onRejection: sinon.match.func }))
    })

    it('fails the block order if the order is rejected', async () => {
      worker.failBlockOrder = sinon.stub()
      await worker._fillOrders(blockOrder, orders, targetDepth)

      const { onRejection } = FillStateMachine.create.args[0][0]

      const err = new Error('fale')
      onRejection(err)

      await delay(10)

      expect(worker.failBlockOrder).to.have.been.calledOnce()
      expect(worker.failBlockOrder).to.have.been.calledWith(blockOrder.id, err)
    })
  })

  describe('#_placeOrder', () => {
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
        price: Big('1000'),
        timeInForce: 'GTC'
      }
      order = {
        id: 'anotherId'
      }
      OrderStateMachine.create.resolves(order)
    })

    it('creates an OrderStateMachine', async () => {
      await worker._placeOrder(blockOrder, '100')

      expect(OrderStateMachine.create).to.have.been.calledOnce()
    })

    it('passes the symbols from the block order', async () => {
      await worker._placeOrder(blockOrder, '100')

      expect(OrderStateMachine.create).to.have.been.calledWith(sinon.match.any, sinon.match({ baseSymbol: blockOrder.baseSymbol }))
      expect(OrderStateMachine.create).to.have.been.calledWith(sinon.match.any, sinon.match({ counterSymbol: blockOrder.counterSymbol }))
    })

    it('passes the side from the block order', async () => {
      await worker._placeOrder(blockOrder, '100')

      expect(OrderStateMachine.create).to.have.been.calledWith(sinon.match.any, sinon.match({ side: blockOrder.side }))
    })

    it('passes the amount as the base amount to the OrderStateMachine', async () => {
      await worker._placeOrder(blockOrder, '100')

      expect(OrderStateMachine.create).to.have.been.calledWith(sinon.match.any, sinon.match({ baseAmount: '100' }))
    })

    it('uses the block order price to translate to counter amount', async () => {
      await worker._placeOrder(blockOrder, '100')

      expect(OrderStateMachine.create).to.have.been.calledWith(sinon.match.any, sinon.match({ counterAmount: '100000' }))
    })

    it('provides a sublevel of the block order for the OrderStateMachine', async () => {
      await worker._placeOrder(blockOrder, '100')

      expect(store.sublevel).to.have.been.calledWith(blockOrder.id)
      expect(secondLevel.sublevel).to.have.been.calledWith('orders')
      expect(OrderStateMachine.create).to.have.been.calledWith(sinon.match({ store: thirdLevel }))
    })

    it('provides the relayer to the OrderStateMachine', async () => {
      await worker._placeOrder(blockOrder, '100')

      expect(OrderStateMachine.create).to.have.been.calledWith(sinon.match({ relayer }))
    })

    it('provides the engine to the OrderStateMachine', async () => {
      await worker._placeOrder(blockOrder, '100')

      expect(OrderStateMachine.create).to.have.been.calledWith(sinon.match({ engine }))
    })

    it('provides a handler for onRejection', async () => {
      await worker._placeOrder(blockOrder, '100')

      expect(OrderStateMachine.create).to.have.been.calledWith(sinon.match({ onRejection: sinon.match.func }))
    })

    it('fails the block order if the order is rejected', async () => {
      worker.failBlockOrder = sinon.stub()
      await worker._placeOrder(blockOrder, '100')

      const { onRejection } = OrderStateMachine.create.args[0][0]

      const err = new Error('fale')
      onRejection(err)

      await delay(10)

      expect(worker.failBlockOrder).to.have.been.calledOnce()
      expect(worker.failBlockOrder).to.have.been.calledWith(blockOrder.id, err)
    })
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

      orderbooks.get('BTC/LTC').getBestOrders.resolves({
        orders,
        depth: '190'
      })
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

  describe('getBlockOrders', () => {
    let market
    let worker
    let getRecords
    let firstBlockOrder
    let secondBlockOrder

    beforeEach(() => {
      market = 'BTC/LTC'
      firstBlockOrder = { marketName: 'BTC/LTC' }
      secondBlockOrder = { marketName: 'ABC/XYZ' }
      getRecords = sinon.stub().resolves([firstBlockOrder, secondBlockOrder])
      BlockOrderWorker.__set__('getRecords', getRecords)
      worker = new BlockOrderWorker({ orderbooks, store, logger, relayer, engine })
    })

    it('retrieves all block orders from the store', async () => {
      BlockOrder.fromStorage.bind = sinon.stub()
      await worker.getBlockOrders(market)

      expect(getRecords).to.have.been.calledOnce()
      expect(getRecords).to.have.been.calledWith(store, BlockOrder.fromStorage.bind(BlockOrder))
    })

    it('filters the block orders by market', async () => {
      const res = await worker.getBlockOrders(market)

      expect(res).to.eql([firstBlockOrder])
    })
  })
})
