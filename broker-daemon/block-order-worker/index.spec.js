const path = require('path')
const { Big } = require('../utils')
const { expect, rewire, sinon } = require('test/test-helper')

const BlockOrderWorker = rewire(path.resolve(__dirname))

describe('BlockOrderWorker', () => {
  let safeid
  let BlockOrder
  let Order
  let Fill
  let OrderStateMachine
  let FillStateMachine
  let SublevelIndex
  let loggerErrorStub

  let orderbooks
  let store
  let logger
  let relayer
  let engines

  let secondLevel

  beforeEach(() => {
    loggerErrorStub = sinon.stub()
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
    BlockOrder.fromStore = sinon.stub()
    BlockOrderWorker.__set__('BlockOrder', BlockOrder)

    Order = {
      fromObject: sinon.stub(),
      fromStorage: sinon.stub(),
      rangeForBlockOrder: sinon.stub()
    }
    BlockOrderWorker.__set__('Order', Order)

    Fill = {
      fromObject: sinon.stub(),
      rangeForBlockOrder: sinon.stub()
    }
    BlockOrderWorker.__set__('Fill', Fill)

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

    SublevelIndex = sinon.stub()
    BlockOrderWorker.__set__('SublevelIndex', SublevelIndex)

    orderbooks = new Map([['BTC/LTC', {
      getBestOrders: sinon.stub(),
      baseSymbol: 'BTC',
      counterSymbol: 'LTC'
    }]])

    secondLevel = {
      put: sinon.stub()
    }
    store = {
      sublevel: sinon.stub().returns(secondLevel),
      put: sinon.stub().callsArgAsync(2),
      get: sinon.stub()
    }
    logger = {
      info: sinon.stub(),
      error: loggerErrorStub,
      debug: sinon.stub()
    }
    relayer = sinon.stub()
    engines = new Map([ ['BTC', sinon.stub()], ['LTC', sinon.stub()] ])
  })

  describe('new', () => {
    let worker

    beforeEach(() => {
      worker = new BlockOrderWorker({ orderbooks, store, logger, relayer, engines })
    })

    it('assigns the orderbooks', () => {
      expect(worker).to.have.property('orderbooks', orderbooks)
    })

    it('assigns the store', () => {
      expect(worker).to.have.property('store', store)
    })

    it('creates an orders store', () => {
      expect(store.sublevel).to.have.been.calledTwice()
      expect(store.sublevel).to.have.been.calledWith('orders')
      expect(worker).to.have.property('ordersStore', secondLevel)
    })

    it('creates a fills store', () => {
      expect(store.sublevel).to.have.been.calledTwice()
      expect(store.sublevel).to.have.been.calledWith('fills')
      expect(worker).to.have.property('fillsStore', secondLevel)
    })

    it('assigns the logger', () => {
      expect(worker).to.have.property('logger', logger)
    })

    it('assigns the relayer', () => {
      expect(worker).to.have.property('relayer', relayer)
    })

    it('assigns the engines', () => {
      expect(worker).to.have.property('engines', engines)
    })

    it('creates an index for the orders store', async () => {
      expect(SublevelIndex).to.have.been.calledOnce()
      expect(SublevelIndex).to.have.been.calledWithNew()
      expect(SublevelIndex).to.have.been.calledWith(secondLevel, 'ordersByHash')
      expect(worker).to.have.property('ordersByHash')
      expect(worker.ordersByHash).to.be.instanceOf(SublevelIndex)
    })

    it('indexes the orders store by swap hash', async () => {
      const getValue = SublevelIndex.args[0][2]

      const fakeKey = 'mykey'
      const fakeValue = 'myvalue'
      const fakeOrder = {
        swapHash: 'fakeHash'
      }
      Order.fromStorage.returns(fakeOrder)

      const indexValue = getValue(fakeKey, fakeValue)

      expect(Order.fromStorage).to.have.been.calledOnce()
      expect(Order.fromStorage).to.have.been.calledWith(fakeKey, fakeValue)
      expect(indexValue).to.be.equal(fakeOrder.swapHash)
    })

    it('indexes the orders that have a swap hash', async () => {
      const filter = SublevelIndex.args[0][3]

      const fakeKey = 'mykey'
      const fakeValue = 'myvalue'
      const fakeOrder = {
        swapHash: 'fakeHash'
      }
      Order.fromStorage.returns(fakeOrder)

      const filtered = filter(fakeKey, fakeValue)

      expect(Order.fromStorage).to.have.been.calledOnce()
      expect(Order.fromStorage).to.have.been.calledWith(fakeKey, fakeValue)
      expect(filtered).to.be.equal(true)
    })

    it('does not index the orders that do not have a swap hash', async () => {
      const filter = SublevelIndex.args[0][3]

      const fakeKey = 'mykey'
      const fakeValue = 'myvalue'
      const fakeOrder = {
        swapHash: undefined
      }
      Order.fromStorage.returns(fakeOrder)

      const filtered = filter(fakeKey, fakeValue)

      expect(Order.fromStorage).to.have.been.calledOnce()
      expect(Order.fromStorage).to.have.been.calledWith(fakeKey, fakeValue)
      expect(filtered).to.be.equal(false)
    })
  })

  describe('initialize', () => {
    let worker
    let ensureIndex

    beforeEach(() => {
      ensureIndex = sinon.stub().resolves()
      SublevelIndex.prototype.ensureIndex = ensureIndex
      worker = new BlockOrderWorker({ orderbooks, store, logger, relayer, engines })
    })

    it('rebuilds the ordersByHash index', async () => {
      await worker.initialize()

      expect(ensureIndex).to.have.been.calledOnce()
    })

    it('waits for index rebuilding to complete', () => {
      ensureIndex.rejects()

      return expect(worker.initialize()).to.eventually.be.rejectedWith(Error)
    })
  })

  describe('createBlockOrder', () => {
    let worker
    let workBlockOrderStub
    let failBlockOrderStub

    beforeEach(() => {
      workBlockOrderStub = sinon.stub().resolves()
      failBlockOrderStub = sinon.stub()

      worker = new BlockOrderWorker({ orderbooks, store, logger, relayer, engines })
      worker.workBlockOrder = workBlockOrderStub
      worker.failBlockOrder = failBlockOrderStub
    })

    it('throws if the market is not supported', () => {
      const params = {
        marketName: 'ABC/XYZ',
        side: 'BID',
        amount: '10000',
        price: '100',
        timeInForce: 'GTC'
      }
      return expect(worker.createBlockOrder(params)).to.be.rejectedWith('is not being tracked as a market')
    })

    it('throws if an engine does not exist', () => {
      worker.orderbooks.set('BTC/XYZ', {
        baseSymbol: 'BTC',
        counterSymbol: 'XYZ'
      })
      const params = {
        marketName: 'BTC/XYZ',
        side: 'BID',
        amount: '10000',
        price: '100',
        timeInForce: 'GTC'
      }
      return expect(worker.createBlockOrder(params)).to.be.rejectedWith('No engine available')
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

    it('starts working a block order', async () => {
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
      expect(workBlockOrderStub).to.have.been.calledOnce()
    })

    it('fails a block order if working a block order is unsuccessful', async () => {
      const fakeId = 'myfake'
      safeid.returns(fakeId)

      const params = {
        marketName: 'BTC/LTC',
        side: 'BID',
        amount: '10000',
        price: '100',
        timeInForce: 'GTC'
      }

      workBlockOrderStub.rejects()

      await worker.createBlockOrder(params)

      expect(workBlockOrderStub).to.have.been.calledOnce()
      expect(failBlockOrderStub).to.have.been.calledOnce()
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

      BlockOrder.fromStore.returns(fakeBlockOrder)
      worker = new BlockOrderWorker({ orderbooks, store, logger, relayer, engines })
      fakeErr = new Error('fake')
      fakeId = 'myid'
    })

    it('retrieves a block order from the store', async () => {
      await worker.failBlockOrder(fakeId, fakeErr)

      expect(BlockOrder.fromStore).to.have.been.calledOnce()
      expect(BlockOrder.fromStore).to.have.been.calledWith(store, fakeId)
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
      BlockOrder.fromStore.returns({ id: blockOrderId })
      worker = new BlockOrderWorker({ orderbooks, store, logger, relayer, engines })
    })

    it('retrieves a block order from the store', async () => {
      const fakeId = 'myid'
      await worker.getBlockOrder(fakeId)

      expect(BlockOrder.fromStore).to.have.been.calledOnce()
      expect(BlockOrder.fromStore).to.have.been.calledWith(store)
    })

    it('retrieves all open orders associated with a block order', async () => {
      const fakeRange = 'myrange'
      const fakeId = 'myid'
      Order.rangeForBlockOrder.returns(fakeRange)

      const bO = await worker.getBlockOrder(fakeId)

      expect(Order.rangeForBlockOrder).to.have.been.calledOnce()
      expect(Order.rangeForBlockOrder).to.have.been.calledWith(bO.id)
      expect(OrderStateMachine.getAll).to.have.been.calledOnce()
      expect(OrderStateMachine.getAll).to.have.been.calledWith(sinon.match({ store: secondLevel }), fakeRange)
      expect(bO).to.have.property('openOrders', orders)
    })

    it('retrieves all fills associated with a block order', async () => {
      const fakeRange = 'myrange'
      const fakeId = 'myid'
      Fill.rangeForBlockOrder.returns(fakeRange)

      const bO = await worker.getBlockOrder(fakeId)

      expect(Fill.rangeForBlockOrder).to.have.been.calledOnce()
      expect(Fill.rangeForBlockOrder).to.have.been.calledWith(bO.id)
      expect(FillStateMachine.getAll).to.have.been.calledOnce()
      expect(FillStateMachine.getAll).to.have.been.calledWith(sinon.match({ store: secondLevel }), fakeRange)
      expect(bO).to.have.property('fills', fills)
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
    let identityStub

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
      BlockOrder.fromStore.returns({
        id: blockOrderId,
        cancel: blockOrderCancel,
        key: blockOrderKey,
        value: blockOrderValue
      })
      getRecords = sinon.stub().resolves(orders)
      identityStub = sinon.stub()

      BlockOrderWorker.__set__('getRecords', getRecords)

      relayer.makerService = {
        cancelOrder: sinon.stub().resolves()
      }
      relayer.identity = {
        authorize: identityStub.returns('identity')
      }

      worker = new BlockOrderWorker({ orderbooks, store, logger, relayer, engines })
    })

    it('retrieves a block order from the store', async () => {
      const fakeId = 'myid'
      await worker.cancelBlockOrder(fakeId)

      expect(BlockOrder.fromStore).to.have.been.calledOnce()
      expect(BlockOrder.fromStore).to.have.been.calledWith(store, fakeId)
    })

    it('retrieves all open orders associated with a block order', async () => {
      const fakeRange = 'myrange'
      const fakeId = 'myid'
      Order.rangeForBlockOrder.returns(fakeRange)

      const bO = await worker.cancelBlockOrder(fakeId)

      expect(Order.rangeForBlockOrder).to.have.been.calledOnce()
      expect(Order.rangeForBlockOrder).to.have.been.calledWith(bO.id)
      expect(getRecords).to.have.been.calledOnce()
      expect(getRecords).to.have.been.calledWith(secondLevel, sinon.match.func, fakeRange)
    })

    it('cancels all of the orders on the relayer', async () => {
      const fakeId = 'myid'

      await worker.cancelBlockOrder(fakeId)

      expect(relayer.makerService.cancelOrder).to.have.been.calledOnce()
      expect(relayer.makerService.cancelOrder).to.have.been.calledWith(sinon.match({ orderId: orders[0].order.orderId }))
    })

    it('fails the block order if relayer cancellation fails', async () => {
      const fakeError = new Error('myerror')
      const fakeId = 'myid'

      worker.failBlockOrder = sinon.stub()
      relayer.makerService.cancelOrder.rejects(fakeError)

      try {
        await worker.cancelBlockOrder(fakeId)
      } catch (e) {
        expect(e).to.be.eql(fakeError)
        expect(worker.failBlockOrder).to.have.been.calledOnce()
        expect(worker.failBlockOrder).to.have.been.calledWith(fakeId, fakeError)
        return
      }

      throw new Error('Expected relayer cancellation to throw an error')
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

    it('authorizes the request', async () => {
      const orderId = orders[0].order.orderId
      await worker.cancelBlockOrder(orderId)
      expect(relayer.identity.authorize).to.have.been.calledWith(orderId)
    })
  })

  describe('#workBlockOrder', () => {
    let worker
    let blockOrder
    let order

    beforeEach(() => {
      worker = new BlockOrderWorker({ orderbooks, store, logger, relayer, engines })
      blockOrder = {
        id: 'fakeId',
        marketName: 'BTC/LTC',
        baseSymbol: 'BTC',
        counterSymbol: 'LTC',
        side: 'BID',
        amount: Big('100'),
        price: Big('1000'),
        baseAmount: '0.0000001000000000',
        counterAmount: '0.0001000000000000',
        quantumPrice: '1000.00000000000000000'
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
      worker = new BlockOrderWorker({ orderbooks, store, logger, relayer, engines })
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
        baseAmount: '100000000000',
        price: Big('1000'),
        timeInForce: 'GTC',
        counterAmount: '100000000000000',
        quantumPrice: '1000.00000000000000000'
      }
      order = {
        id: 'anotherId'
      }
      OrderStateMachine.create.resolves(order)

      orders = [
        { orderId: '1', baseAmount: '90000000000' }
      ]

      orderbooks.get('BTC/LTC').getBestOrders.resolves({
        orders,
        depth: '90000000000'
      })
    })

    it('gets the best orders from the orderbook', async () => {
      await worker.workLimitBlockOrder(blockOrder)

      expect(orderbooks.get('BTC/LTC').getBestOrders).to.have.been.calledOnce()
      expect(orderbooks.get('BTC/LTC').getBestOrders).to.have.been.calledWith(sinon.match({ side: 'ASK', depth: '100000000000', quantumPrice: '1000.00000000000000000' }))
    })

    it('fills as many orders as possible at the given price or better', async () => {
      await worker.workLimitBlockOrder(blockOrder)

      expect(worker._fillOrders).to.have.been.calledOnce()
      expect(worker._fillOrders.args[0][0]).to.be.eql(blockOrder)
      expect(worker._fillOrders.args[0][1]).to.be.eql(orders)
      expect(worker._fillOrders.args[0][2]).to.be.eql('100000000000')
    })

    it('places an order for the remaining amount', async () => {
      await worker.workLimitBlockOrder(blockOrder)

      expect(worker._placeOrder).to.have.been.calledOnce()
      expect(worker._placeOrder.args[0][0]).to.be.eql(blockOrder)
      expect(worker._placeOrder.args[0][1]).to.be.eql('10000000000')
    })

    it('does not place an order if it can be filled with fills only', async () => {
      orders.push({ orderId: '1', baseAmount: '10000000000' })
      orderbooks.get('BTC/LTC').getBestOrders.resolves({
        orders,
        depth: '190000000000'
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
      worker = new BlockOrderWorker({ orderbooks, store, logger, relayer, engines })
      blockOrder = {
        id: 'fakeId',
        marketName: 'BTC/LTC',
        baseSymbol: 'BTC',
        counterSymbol: 'LTC',
        side: 'BID',
        inverseSide: 'ASK',
        amount: Big('0.000000100'),
        baseAmount: '100',
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

  describe('checkBlockOrderCompletion', () => {
    context('invalid block order', () => {
      let blockOrder
      let getBlockOrderStub
      let worker

      beforeEach(() => {
        getBlockOrderStub = sinon.stub()
        blockOrder = {
          id: '1234',
          fills: [],
          openOrders: []
        }

        worker = new BlockOrderWorker({ orderbooks, store, logger, relayer, engines })
        worker.blockOrder = blockOrder
        worker.getBlockOrder = getBlockOrderStub.returns(blockOrder)
      })

      it('gets a block order by id', async () => {
        await worker.checkBlockOrderCompletion(blockOrder.id).catch(() => {})
        expect(getBlockOrderStub).to.have.been.calledWith(blockOrder.id)
      })
    })

    context('block order with openOrders', () => {
      let blockOrder
      let getBlockOrderStub
      let worker
      let orderStateMachines
      let blockOrderCompleteStub

      beforeEach(() => {
        getBlockOrderStub = sinon.stub()
        blockOrderCompleteStub = sinon.stub()
        orderStateMachines = [
          { order: { fillAmount: 100 } },
          { order: { fillAmount: 200 } },
          { order: { fillAmount: 300 } }
        ]
        blockOrder = {
          id: '1234',
          baseAmount: 600,
          fills: [],
          openOrders: orderStateMachines,
          complete: blockOrderCompleteStub
        }

        worker = new BlockOrderWorker({ orderbooks, store, logger, relayer, engines })
        worker.blockOrder = blockOrder
        worker.getBlockOrder = getBlockOrderStub.returns(blockOrder)
      })

      it('completes a block order', async () => {
        await worker.checkBlockOrderCompletion(blockOrder.id)
        expect(blockOrderCompleteStub).to.have.been.calledOnce()
      })

      it('does not complete a block order if order is not filled', async () => {
        const activeBlockOrder = {
          id: '1234',
          baseAmount: 600,
          fills: [],
          openOrders: [
            { order: { fillAmount: 100 } }
          ]
        }
        getBlockOrderStub.returns(activeBlockOrder)
        await worker.checkBlockOrderCompletion(blockOrder.id)
        expect(blockOrderCompleteStub).to.not.have.been.calledOnce()
      })
    })

    context('block order with fills', () => {
      let blockOrder
      let getBlockOrderStub
      let worker
      let fillStateMachines
      let blockOrderCompleteStub

      beforeEach(() => {
        getBlockOrderStub = sinon.stub()
        blockOrderCompleteStub = sinon.stub()
        fillStateMachines = [
          { fill: { fillAmount: 100 } },
          { fill: { fillAmount: 200 } },
          { fill: { fillAmount: 300 } }
        ]
        blockOrder = {
          id: '1234',
          baseAmount: 600,
          fills: fillStateMachines,
          openOrders: [],
          complete: blockOrderCompleteStub
        }

        worker = new BlockOrderWorker({ orderbooks, store, logger, relayer, engines })
        worker.blockOrder = blockOrder
        worker.getBlockOrder = getBlockOrderStub.returns(blockOrder)
      })

      it('completes a block order', async () => {
        await worker.checkBlockOrderCompletion(blockOrder.id)
        expect(blockOrderCompleteStub).to.have.been.calledOnce()
      })

      it('does not complete a block order if block order is still being filled', async () => {
        const activeBlockOrder = {
          id: '1234',
          baseAmount: 600,
          openOrders: [],
          fills: [
            { fill: { fillAmount: 100 } }
          ]
        }
        getBlockOrderStub.returns(activeBlockOrder)
        await worker.checkBlockOrderCompletion(blockOrder.id)
        expect(blockOrderCompleteStub).to.not.have.been.calledOnce()
      })
    })

    context('block order with fills/orders', () => {
      let blockOrder
      let getBlockOrderStub
      let worker
      let fillStateMachines
      let orderStateMachines
      let blockOrderCompleteStub

      beforeEach(() => {
        getBlockOrderStub = sinon.stub()
        blockOrderCompleteStub = sinon.stub()
        fillStateMachines = [
          { fill: { fillAmount: 100 } },
          { fill: { fillAmount: 200 } }
        ]
        orderStateMachines = [
          { order: { fillAmount: 100 } },
          { order: { fillAmount: 300 } }
        ]
        blockOrder = {
          id: '1234',
          baseAmount: 600,
          fills: fillStateMachines,
          openOrders: orderStateMachines,
          complete: blockOrderCompleteStub
        }

        worker = new BlockOrderWorker({ orderbooks, store, logger, relayer, engines })
        worker.blockOrder = blockOrder
        worker.getBlockOrder = getBlockOrderStub.returns(blockOrder)
      })

      it('completes a block order', async () => {
        await worker.checkBlockOrderCompletion(blockOrder.id)
        expect(blockOrderCompleteStub).to.have.been.calledOnce()
      })

      it('does not complete a block order if block order is still being filled through fills', async () => {
        const activeBlockOrder = {
          id: '1234',
          baseAmount: 700,
          openOrders: orderStateMachines,
          fills: [
            { fill: { fillAmount: 100 } }
          ]
        }
        getBlockOrderStub.returns(activeBlockOrder)
        await worker.checkBlockOrderCompletion(blockOrder.id)
        expect(blockOrderCompleteStub).to.not.have.been.calledOnce()
      })

      it('does not complete a block order if block order is still being filled through orders', async () => {
        const activeBlockOrder = {
          id: '1234',
          baseAmount: 700,
          openOrders: [
            { order: { fillAmount: 100 } }
          ],
          fills: fillStateMachines
        }
        getBlockOrderStub.returns(activeBlockOrder)
        await worker.checkBlockOrderCompletion(blockOrder.id)
        expect(blockOrderCompleteStub).to.not.have.been.calledOnce()
      })
    })
  })

  describe('#_fillOrders', () => {
    let worker
    let blockOrder
    let fill
    let orders
    let targetDepth
    let onceStub
    let removeAllListenersStub

    beforeEach(() => {
      onceStub = sinon.stub()
      removeAllListenersStub = sinon.stub()
      worker = new BlockOrderWorker({ orderbooks, store, logger, relayer, engines })
      blockOrder = {
        id: 'fakeId',
        marketName: 'BTC/LTC',
        baseSymbol: 'BTC',
        counterSymbol: 'LTC',
        side: 'BID',
        inverseSide: 'ASK',
        amount: Big('0.000000100'),
        baseAmount: '100',
        price: null
      }
      fill = {
        id: 'anotherId',
        once: onceStub,
        removeAllListeners: removeAllListenersStub,
        fill: {}
      }
      FillStateMachine.create.resolves(fill)
      orders = [
        { orderId: '1', baseAmount: '90' },
        { orderId: '2', baseAmount: '100' }
      ]
      targetDepth = '100'
    })

    it('throws if one of the engines is missing', () => {
      blockOrder.marketName = 'BTC/XYZ'
      blockOrder.counterSymbol = 'XYZ'

      return expect(worker._placeOrder(blockOrder, orders, targetDepth)).to.eventually.be.rejectedWith('No engine available')
    })

    it('creates FillStateMachines for each fill', async () => {
      await worker._fillOrders(blockOrder, orders, targetDepth)

      expect(FillStateMachine.create).to.have.been.calledTwice()
      expect(FillStateMachine.create).to.have.been.calledWith(sinon.match.any, sinon.match.any, orders[0])
      expect(FillStateMachine.create).to.have.been.calledWith(sinon.match.any, sinon.match.any, orders[1])
    })

    it('provides the blockOrderId to each state machine', async () => {
      await worker._fillOrders(blockOrder, orders, targetDepth)

      const call = FillStateMachine.create.args[0]

      expect(call[1]).to.eql(blockOrder.id)
    })

    it('provides the full fill amount for orders before the last', async () => {
      await worker._fillOrders(blockOrder, orders, targetDepth)

      const call = FillStateMachine.create.args[0]

      expect(call[3]).to.eql({ fillAmount: orders[0].baseAmount })
    })

    it('provides the remaining fill amount for the last order', async () => {
      await worker._fillOrders(blockOrder, orders, targetDepth)

      const call = FillStateMachine.create.args[1]

      expect(call[3]).to.eql({ fillAmount: '10' })
    })

    it('stops filling early if it fills the target depth', async () => {
      orders.push({ orderId: '3', baseAmount: '100' })

      await worker._fillOrders(blockOrder, orders, targetDepth)

      expect(FillStateMachine.create).to.have.been.calledTwice()
    })

    it('provides the fill store the FillStateMachine', async () => {
      await worker._fillOrders(blockOrder, orders, targetDepth)

      expect(FillStateMachine.create).to.have.been.calledWith(sinon.match({ store: secondLevel }))
    })

    it('provides the relayer to the FillStateMachine', async () => {
      await worker._fillOrders(blockOrder, orders, targetDepth)

      expect(FillStateMachine.create).to.have.been.calledWith(sinon.match({ relayer }))
    })

    it('provides the engine to the FillStateMachine', async () => {
      await worker._fillOrders(blockOrder, orders, targetDepth)

      expect(FillStateMachine.create).to.have.been.calledWith(sinon.match({ engines }))
    })

    describe('execute event', () => {
      let blockOrderCompleteStub

      beforeEach(() => {
        blockOrderCompleteStub = sinon.stub().resolves(true)
        worker.checkBlockOrderCompletion = blockOrderCompleteStub
      })

      beforeEach(async () => {
        await worker._fillOrders(blockOrder, orders, targetDepth)
      })

      it('registers an event on an order for order completion', async () => {
        expect(onceStub).to.have.been.calledWith('execute', sinon.match.func)
      })

      it('attempts to complete a block order', async () => {
        await onceStub.args[0][1]()
        expect(blockOrderCompleteStub).to.have.been.calledOnce()
      })

      it('catches an exception if checkBlockOrderCompletion fails', async () => {
        blockOrderCompleteStub.rejects()
        await onceStub.args[0][1]()
        expect(blockOrderCompleteStub).to.have.been.calledOnce()
        expect(loggerErrorStub).to.have.been.calledWith(sinon.match('BlockOrder failed'), sinon.match.any)
      })
    })

    describe('reject event', () => {
      let failBlockOrderStub

      beforeEach(() => {
        failBlockOrderStub = sinon.stub().resolves(true)
        worker.failBlockOrder = failBlockOrderStub
      })

      beforeEach(async () => {
        await worker._fillOrders(blockOrder, orders, targetDepth)
      })

      it('registers an event on an order for order rejection', async () => {
        expect(onceStub).to.have.been.calledWith('reject', sinon.match.func)
      })

      it('fails a block order if the call is rejected', async () => {
        await onceStub.args[1][1]()
        expect(failBlockOrderStub).to.have.been.calledOnce()
      })

      it('catches an exception if failBlockOrder fails', async () => {
        failBlockOrderStub.rejects()
        await onceStub.args[1][1]()
        expect(failBlockOrderStub).to.have.been.calledOnce()
        expect(loggerErrorStub).to.have.been.calledWith(sinon.match('BlockOrder failed'), sinon.match.any)
      })
    })
  })

  describe('#_placeOrder', () => {
    let worker
    let blockOrder
    let order
    let onceStub
    let removeAllListenersStub

    beforeEach(() => {
      onceStub = sinon.stub()
      removeAllListenersStub = sinon.stub()
      worker = new BlockOrderWorker({ orderbooks, store, logger, relayer, engines })
      blockOrder = {
        id: 'fakeId',
        marketName: 'BTC/LTC',
        baseSymbol: 'BTC',
        counterSymbol: 'LTC',
        side: 'BID',
        amount: Big('0.000000100'),
        baseAmount: '100',
        counterAmount: '100000',
        price: Big('1000'),
        timeInForce: 'GTC'
      }
      order = {
        id: 'anotherId',
        once: onceStub,
        order: {
          orderId: 'orderid'
        },
        removeAllListeners: removeAllListenersStub
      }
      OrderStateMachine.create.resolves(order)
    })

    it('throws if one of the engines is missing', () => {
      blockOrder.marketName = 'BTC/XYZ'
      blockOrder.counterSymbol = 'XYZ'

      return expect(worker._placeOrder(blockOrder, '100')).to.eventually.be.rejectedWith('No engine available')
    })

    it('creates an OrderStateMachine', async () => {
      await worker._placeOrder(blockOrder, '100')

      expect(OrderStateMachine.create).to.have.been.calledOnce()
    })

    it('provides the blockOrderId to each state machine', async () => {
      await worker._placeOrder(blockOrder, '100')

      expect(OrderStateMachine.create).to.have.been.calledWith(sinon.match.any, blockOrder.id)
    })

    it('passes the symbols from the block order', async () => {
      await worker._placeOrder(blockOrder, '100')

      expect(OrderStateMachine.create).to.have.been.calledWith(sinon.match.any, sinon.match.any, sinon.match({ baseSymbol: blockOrder.baseSymbol }))
      expect(OrderStateMachine.create).to.have.been.calledWith(sinon.match.any, sinon.match.any, sinon.match({ counterSymbol: blockOrder.counterSymbol }))
    })

    it('passes the side from the block order', async () => {
      await worker._placeOrder(blockOrder, '100')

      expect(OrderStateMachine.create).to.have.been.calledWith(sinon.match.any, sinon.match.any, sinon.match({ side: blockOrder.side }))
    })

    it('passes the amount as the base amount to the OrderStateMachine', async () => {
      await worker._placeOrder(blockOrder, '100')

      expect(OrderStateMachine.create).to.have.been.calledWith(sinon.match.any, sinon.match.any, sinon.match({ baseAmount: '100' }))
    })

    it('uses the block order price to translate to counter amount', async () => {
      await worker._placeOrder(blockOrder, '100')

      expect(OrderStateMachine.create).to.have.been.calledWith(sinon.match.any, sinon.match.any, sinon.match({ counterAmount: '100000' }))
    })

    it('provides the ordersStore the OrderStateMachine', async () => {
      await worker._placeOrder(blockOrder, '100')

      expect(OrderStateMachine.create).to.have.been.calledWith(sinon.match({ store: secondLevel }))
    })

    it('provides the relayer to the OrderStateMachine', async () => {
      await worker._placeOrder(blockOrder, '100')

      expect(OrderStateMachine.create).to.have.been.calledWith(sinon.match({ relayer }))
    })

    it('provides the engines to the OrderStateMachine', async () => {
      await worker._placeOrder(blockOrder, '100')

      expect(OrderStateMachine.create).to.have.been.calledWith(sinon.match({ engines }))
    })

    describe('complete event', () => {
      let blockOrderCompleteStub

      beforeEach(() => {
        blockOrderCompleteStub = sinon.stub().resolves(true)
        worker.checkBlockOrderCompletion = blockOrderCompleteStub
      })

      beforeEach(async () => {
        await worker._placeOrder(blockOrder, '100')
      })

      it('registers an event on an order for order completion', async () => {
        expect(onceStub).to.have.been.calledWith('complete', sinon.match.func)
      })

      it('attempts to complete a block order', async () => {
        await onceStub.args[0][1]()
        expect(blockOrderCompleteStub).to.have.been.calledOnce()
      })

      it('catches an exception if checkBlockOrderCompletion fails', async () => {
        blockOrderCompleteStub.rejects()
        await onceStub.args[0][1]()
        expect(blockOrderCompleteStub).to.have.been.calledOnce()
        expect(loggerErrorStub).to.have.been.calledWith(sinon.match('BlockOrder failed'), sinon.match.any)
      })
    })

    describe('reject event', () => {
      let failBlockOrderStub

      beforeEach(() => {
        failBlockOrderStub = sinon.stub().resolves(true)
        worker.failBlockOrder = failBlockOrderStub
      })

      beforeEach(async () => {
        await worker._placeOrder(blockOrder, '100')
      })

      it('registers an event on an order for order rejection', async () => {
        expect(onceStub).to.have.been.calledWith('reject', sinon.match.func)
      })

      it('fails a block order if the call is rejected', async () => {
        await onceStub.args[1][1]()
        expect(failBlockOrderStub).to.have.been.calledOnce()
      })

      it('catches an exception if failBlockOrder fails', async () => {
        failBlockOrderStub.rejects()
        await onceStub.args[1][1]()
        expect(failBlockOrderStub).to.have.been.calledOnce()
        expect(loggerErrorStub).to.have.been.calledWith(sinon.match('BlockOrder failed'), sinon.match.any)
      })
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
      BlockOrder.fromStorage = {
        bind: sinon.stub()
      }
      worker = new BlockOrderWorker({ orderbooks, store, logger, relayer, engines })
    })

    it('retrieves all block orders from the store', async () => {
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
