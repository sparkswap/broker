const path = require('path')
const { Big } = require('../utils')
const { expect, rewire, sinon } = require('test/test-helper')

const BlockOrderWorker = rewire(path.resolve(__dirname))

describe('BlockOrderWorker', () => {
  let generateId
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
  let engineLtc
  let engineBtc

  let secondLevel

  beforeEach(() => {
    loggerErrorStub = sinon.stub()
    generateId = sinon.stub()
    BlockOrderWorker.__set__('generateId', generateId)

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
    OrderStateMachine.STATES = {
      NONE: 'none',
      CREATED: 'created',
      PLACED: 'placed',
      EXECUTING: 'executing',
      CANCELLED: 'cancelled',
      COMPLETED: 'completed'
    }

    OrderStateMachine.INDETERMINATE_STATES = {
      CREATED: 'created',
      PLACED: 'placed',
      EXECUTING: 'executing'
    }

    FillStateMachine = sinon.stub()
    FillStateMachine.create = sinon.stub()
    FillStateMachine.STATES = {
      NONE: 'none',
      CREATED: 'created',
      FILLED: 'filled',
      EXECUTED: 'executed'
    }

    FillStateMachine.INDETERMINATE_STATES = {
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

    engineLtc = {
      quantumsPerCommon: '100000000',
      symbol: 'LTC',
      maxChannelBalance: '1006632900',
      maxPaymentSize: '251658225'
    }

    engineBtc = {
      quantumsPerCommon: '100000000',
      symbol: 'BTC',
      maxChannelBalance: '16777215',
      maxPaymentSize: '4194304'
    }

    engines = new Map([
      ['BTC', engineBtc],
      ['LTC', engineLtc]
    ])
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

    it('creates indices for the orders store', async () => {
      expect(SublevelIndex).to.have.been.calledTwice()
      expect(SublevelIndex).to.have.been.calledWithNew()
    })

    it('creates an index for the orders store by hash', async () => {
      expect(SublevelIndex).to.have.been.calledWith(secondLevel, 'ordersByHash')
      expect(worker).to.have.property('ordersByHash')
      expect(worker.ordersByHash).to.be.instanceOf(SublevelIndex)
    })

    it('creates an index for the orders store by hash', async () => {
      expect(SublevelIndex).to.have.been.calledWith(secondLevel, 'ordersByOrderId')
      expect(worker).to.have.property('ordersByOrderId')
      expect(worker.ordersByOrderId).to.be.instanceOf(SublevelIndex)
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

    it('indexes the orders store by order id', async () => {
      const getValue = SublevelIndex.args[1][2]

      const fakeKey = 'mykey'
      const fakeValue = 'myvalue'
      const fakeOrder = {
        orderId: 'fakeOrderId'
      }
      Order.fromStorage.returns(fakeOrder)

      const indexValue = getValue(fakeKey, fakeValue)

      expect(Order.fromStorage).to.have.been.calledOnce()
      expect(Order.fromStorage).to.have.been.calledWith(fakeKey, fakeValue)
      expect(indexValue).to.be.equal(fakeOrder.orderId)
    })

    it('indexes the orders that have a orderId', async () => {
      const filter = SublevelIndex.args[1][3]

      const fakeKey = 'mykey'
      const fakeValue = 'myvalue'
      const fakeOrder = {
        orderId: 'fakeOrderId'
      }
      Order.fromStorage.returns(fakeOrder)

      const filtered = filter(fakeKey, fakeValue)

      expect(Order.fromStorage).to.have.been.calledOnce()
      expect(Order.fromStorage).to.have.been.calledWith(fakeKey, fakeValue)
      expect(filtered).to.be.equal(true)
    })

    it('does not index the orders that do not have an orderId', async () => {
      const filter = SublevelIndex.args[1][3]

      const fakeKey = 'mykey'
      const fakeValue = 'myvalue'
      const fakeOrder = {
        orderId: undefined
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
    let engineValidPromise

    beforeEach(() => {
      engineValidPromise = sinon.stub()
      worker = new BlockOrderWorker({ orderbooks, store, logger, relayer, engines })
      worker.ordersByHash = { ensureIndex: sinon.stub().resolves() }
      worker.ordersByOrderId = { ensureIndex: sinon.stub().resolves() }
      worker.settleIndeterminateOrdersFills = sinon.stub().resolves()
    })

    it('rebuilds the ordersByHash index', async () => {
      await worker.initialize(engineValidPromise)

      expect(worker.ordersByHash.ensureIndex).to.have.been.calledOnce()
    })

    it('rebuilds the ordersByOrderId index', async () => {
      await worker.initialize(engineValidPromise)

      expect(worker.ordersByOrderId.ensureIndex).to.have.been.calledOnce()
    })

    it('waits for index rebuilding to complete', () => {
      worker.ordersByHash.ensureIndex.rejects()

      return expect(worker.initialize(engineValidPromise)).to.eventually.be.rejectedWith(Error)
    })

    it('settles orders and fills in indeterminate states', async () => {
      await worker.initialize(engineValidPromise)

      expect(worker.settleIndeterminateOrdersFills).to.have.been.calledOnceWith(engineValidPromise)
    })
  })

  describe('settleIndeterminateOrdersFills', () => {
    let worker
    let createdOsm
    let cancelledOsm
    let orderStateMachines
    let createdFsm
    let executedFsm
    let fillStateMachines
    let getRecords
    let resolve
    let engineValidPromise

    beforeEach(() => {
      engineValidPromise = new Promise((_resolve) => { resolve = _resolve }) // eslint-disable-line
      cancelledOsm = { state: 'cancelled', triggerState: sinon.stub() }
      createdOsm = { state: 'created', triggerState: sinon.stub() }
      createdFsm = { state: 'created', triggerState: sinon.stub() }
      executedFsm = { state: 'executed', triggerState: sinon.stub() }
      orderStateMachines = [cancelledOsm, createdOsm]
      fillStateMachines = [createdFsm, executedFsm]

      getRecords = sinon.stub()
      getRecords = sinon.stub().resolves([{ blockOrderId: '1234' }])
      BlockOrderWorker.__set__('getRecords', getRecords)
      BlockOrder.fromStorage = {
        bind: sinon.stub()
      }
      worker = new BlockOrderWorker({ orderbooks, store, logger, relayer, engines })
      worker.getOrderStateMachines = sinon.stub().resolves(orderStateMachines)
      worker.getFillStateMachines = sinon.stub().resolves(fillStateMachines)
      worker.applyOsmListeners = sinon.stub()
      worker.applyFsmListeners = sinon.stub()
    })

    beforeEach(() => {
      resolve()
    })

    it('retrieves all blockOrders from the store', async () => {
      await worker.settleIndeterminateOrdersFills(engineValidPromise)

      expect(getRecords).to.have.been.calledWith(store, BlockOrder.fromStorage.bind(BlockOrder))
    })

    it('retrieves orderStateMachines for each blockOrder', async () => {
      await worker.settleIndeterminateOrdersFills(engineValidPromise)

      expect(worker.getFillStateMachines).to.have.been.calledWith({ blockOrderId: '1234' })
    })

    it('does not apply listeners to osm in finished state', async () => {
      await worker.settleIndeterminateOrdersFills(engineValidPromise)

      expect(worker.applyOsmListeners).to.not.have.been.calledWith(cancelledOsm, { blockOrderId: '1234' })
    })

    it('applies listeners to each osm in an indeterminate state', async () => {
      await worker.settleIndeterminateOrdersFills(engineValidPromise)

      expect(worker.applyOsmListeners).to.have.been.calledWith(createdOsm, { blockOrderId: '1234' })
    })

    it('triggers the osm to the next state if the osm is in an indeterminate state', async () => {
      await worker.settleIndeterminateOrdersFills(engineValidPromise)

      expect(createdOsm.triggerState).to.have.been.called()
    })

    it('does not trigger the osm to the next state if the osm is in a finished state', async () => {
      await worker.settleIndeterminateOrdersFills(engineValidPromise)

      expect(cancelledOsm.triggerState).to.not.have.been.called()
    })

    it('retrieves fillStateMachines for each blockOrder', async () => {
      await worker.settleIndeterminateOrdersFills(engineValidPromise)

      expect(worker.getOrderStateMachines).to.have.been.calledWith({ blockOrderId: '1234' })
    })

    it('does not apply listeners to fsm in finished state', async () => {
      await worker.settleIndeterminateOrdersFills(engineValidPromise)

      expect(worker.applyFsmListeners).to.not.have.been.calledWith(executedFsm, { blockOrderId: '1234' })
    })

    it('applies listeners to each fsm in an indeterminate state', async () => {
      await worker.settleIndeterminateOrdersFills(engineValidPromise)

      expect(worker.applyFsmListeners).to.have.been.calledWith(createdFsm, { blockOrderId: '1234' })
    })

    it('triggers the fsm to the next state if the fsm is in an indeterminate state', async () => {
      await worker.settleIndeterminateOrdersFills(engineValidPromise)

      expect(createdFsm.triggerState).to.have.been.called()
    })

    it('does not trigger the fsm to the next state if the fsm is in a finished state', async () => {
      await worker.settleIndeterminateOrdersFills(engineValidPromise)

      expect(executedFsm.triggerState).to.not.have.been.called()
    })
  })

  describe('getOrderStateMachines', () => {
    let ordersStore
    let getRecords
    let orderStateMachines = [
      {
        id: 'someId'
      }
    ]
    let worker
    let blockOrder

    beforeEach(() => {
      ordersStore = {
        put: sinon.stub()
      }
      blockOrder = { id: '1234' }
      getRecords = sinon.stub().resolves(orderStateMachines)

      getRecords.withArgs(ordersStore).resolves(orderStateMachines)

      BlockOrderWorker.__set__('getRecords', getRecords)

      worker = new BlockOrderWorker({ orderbooks, store, logger, relayer, engines })
      worker.ordersStore = ordersStore
    })

    it('retrieves all open orders associated with the block order', async () => {
      const fakeRange = 'myrange'
      Order.rangeForBlockOrder.returns(fakeRange)

      await worker.getOrderStateMachines(blockOrder)

      expect(Order.rangeForBlockOrder).to.have.been.calledOnce()
      expect(Order.rangeForBlockOrder).to.have.been.calledWith(blockOrder.id)
      expect(getRecords).to.have.been.calledOnce()
      expect(getRecords).to.have.been.calledWith(ordersStore, sinon.match.func, fakeRange)
    })

    it('inflates orderStateMachines', async () => {
      const fakeKey = 'mykey'
      const fakeOSM = 'somestate'
      const fakeValue = JSON.stringify({ orderStateMachine: fakeOSM })
      OrderStateMachine.fromStore = sinon.stub()

      await worker.getOrderStateMachines(blockOrder)

      const eachOrder = getRecords.withArgs(ordersStore).args[0][1]

      eachOrder(fakeKey, fakeValue)
      expect(OrderStateMachine.fromStore).to.have.been.calledOnce()
      expect(OrderStateMachine.fromStore).to.have.been.calledWith({ store: ordersStore, logger, relayer, engines }, { key: fakeKey, value: fakeValue })
    })
  })

  describe('getFillStateMachines', () => {
    let fillsStore
    let getRecords
    let fillStateMachines = [
      {
        id: 'someId'
      }
    ]
    let worker
    let blockOrder

    beforeEach(() => {
      fillsStore = {
        put: sinon.stub()
      }
      blockOrder = { id: '1234' }
      getRecords = sinon.stub().resolves(fillStateMachines)

      getRecords.withArgs(fillsStore).resolves(fillStateMachines)

      BlockOrderWorker.__set__('getRecords', getRecords)

      worker = new BlockOrderWorker({ orderbooks, store, logger, relayer, engines })
      worker.fillsStore = fillsStore
    })

    it('retrieves all open fills associated with the block order', async () => {
      const fakeRange = 'myrange'
      Fill.rangeForBlockOrder.returns(fakeRange)

      await worker.getFillStateMachines(blockOrder)

      expect(Fill.rangeForBlockOrder).to.have.been.calledOnce()
      expect(Fill.rangeForBlockOrder).to.have.been.calledWith(blockOrder.id)
      expect(getRecords).to.have.been.calledOnce()
      expect(getRecords).to.have.been.calledWith(fillsStore, sinon.match.func, fakeRange)
    })

    it('inflates orderStateMachines', async () => {
      const fakeKey = 'mykey'
      const fakeFSM = 'somestate'
      const fakeValue = JSON.stringify({ fillStateMachine: fakeFSM })
      FillStateMachine.fromStore = sinon.stub()

      await worker.getFillStateMachines(blockOrder)

      const eachOrder = getRecords.withArgs(fillsStore).args[0][1]

      eachOrder(fakeKey, fakeValue)
      expect(FillStateMachine.fromStore).to.have.been.calledOnce()
      expect(FillStateMachine.fromStore).to.have.been.calledWith({ store: fillsStore, logger, relayer, engines }, { key: fakeKey, value: fakeValue })
    })
  })

  describe('createBlockOrder', () => {
    let worker
    let workBlockOrderStub
    let failBlockOrderStub
    let blockOrderStub

    beforeEach(() => {
      workBlockOrderStub = sinon.stub().resolves()
      failBlockOrderStub = sinon.stub()

      relayer.paymentChannelNetworkService = {
        getAddress: sinon.stub()
      }

      engines = new Map([ ['BTC', {}], ['LTC', {}] ])
      blockOrderStub = {
        key: 'myKey',
        value: 'myValue',
        side: 'BID',
        baseAmount: '200000000'
      }
      BlockOrder = sinon.stub().returns(blockOrderStub)
      BlockOrderWorker.__set__('BlockOrder', BlockOrder)

      worker = new BlockOrderWorker({ orderbooks, store, logger, relayer, engines })
      worker.workBlockOrder = workBlockOrderStub
      worker.failBlockOrder = failBlockOrderStub
      worker.checkFundsAreSufficient = sinon.stub().resolves()
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
      generateId.returns(fakeId)

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
      generateId.returns(fakeId)

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

    it('checks there are sufficient inbound and outbound funds to create the order', async () => {
      const params = {
        marketName: 'BTC/LTC',
        side: 'BID',
        amount: '10000',
        price: '100',
        timeInForce: 'GTC'
      }
      await worker.createBlockOrder(params)

      expect(worker.checkFundsAreSufficient).to.have.been.calledOnce()
      expect(worker.checkFundsAreSufficient).to.have.been.calledWith(blockOrderStub)
    })

    it('throws an error if there are not sufficient inbound and outbound funds to create the order', () => {
      const params = {
        marketName: 'BTC/LTC',
        side: 'BID',
        amount: '10000',
        price: '100',
        timeInForce: 'GTC'
      }
      worker.checkFundsAreSufficient = sinon.stub().rejects(new Error('Insufficient funds'))

      expect(worker.createBlockOrder(params)).to.eventually.be.rejectedWith('Insufficient funds')
    })

    it('saves a block order in the store', async () => {
      const fakeKey = 'myKey'
      const fakeValue = 'myValue'

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
      generateId.returns(fakeId)

      const params = {
        marketName: 'BTC/LTC',
        side: 'BID',
        amount: '10000',
        price: '100',
        timeInForce: 'GTC'
      }

      await worker.createBlockOrder(params)
      expect(workBlockOrderStub).to.have.been.calledOnce()
      expect(workBlockOrderStub).to.have.been.calledWith(blockOrderStub, Big(blockOrderStub.baseAmount))
    })

    it('fails a block order if working a block order is unsuccessful', async () => {
      const fakeId = 'myfake'
      generateId.returns(fakeId)

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

  describe('checkFundsAreSufficient', () => {
    let worker
    let btcEngine
    let ltcEngine
    let blockOrderStub
    let inboundAddress
    let outboundAddress
    let outboundSymbol
    let inboundSymbol
    let outboundAmount
    let inboundAmount
    let activeInboundAmount
    let activeOutboundAmount
    let revert
    let orderbook
    let isMarketOrder

    beforeEach(() => {
      ltcEngine = { isBalanceSufficient: sinon.stub() }
      btcEngine = { isBalanceSufficient: sinon.stub() }
      inboundAddress = 'bolt:tttasdf'
      outboundAddress = 'bolt:asdf1234'
      outboundAmount = '2000000000'
      inboundAmount = '1000000000'
      outboundSymbol = 'LTC'
      inboundSymbol = 'BTC'
      activeInboundAmount = Big('1000')
      activeOutboundAmount = Big('3000')
      orderbook = {
        getAveragePrice: sinon.stub()
      }
      relayer.paymentChannelNetworkService = {
        getAddress: sinon.stub()
      }
      relayer.paymentChannelNetworkService.getAddress.withArgs({ symbol: outboundSymbol }).resolves({ address: outboundAddress })
      relayer.paymentChannelNetworkService.getAddress.withArgs({ symbol: inboundSymbol }).resolves({ address: inboundAddress })

      ltcEngine.isBalanceSufficient.withArgs(outboundAddress, Big(outboundAmount).plus(activeOutboundAmount)).resolves(true)
      btcEngine.isBalanceSufficient.withArgs(inboundAddress, Big(inboundAmount).plus(activeInboundAmount), { outbound: false }).resolves(true)
      ltcEngine.isBalanceSufficient.withArgs(inboundAddress, Big(inboundAmount).plus(activeInboundAmount), { outbound: false }).resolves(true)
      btcEngine.isBalanceSufficient.withArgs(outboundAddress, Big(outboundAmount).plus(activeOutboundAmount)).resolves(true)
      isMarketOrder = false
      engines = new Map([ ['BTC', btcEngine], ['LTC', ltcEngine] ])
      blockOrderStub = {
        key: 'myKey',
        value: 'myValue',
        side: 'BID',
        baseAmount: '200000000',
        price: '60',
        outboundSymbol,
        inboundSymbol,
        outboundAmount,
        inboundAmount,
        isMarketOrder,
        marketName: 'BTC/LTC'
      }
      orderbooks = new Map([['BTC/LTC', {
        getBestOrders: sinon.stub(),
        baseSymbol: 'BTC',
        counterSymbol: 'LTC',
        getAveragePrice: sinon.stub().resolves()
      }]])
      orderbook = orderbooks.get('BTC/LTC')
      BlockOrder = sinon.stub().returns(blockOrderStub)
      revert = BlockOrderWorker.__set__('BlockOrder', BlockOrder)

      worker = new BlockOrderWorker({ orderbooks, store, logger, relayer, engines })
      worker.calculateActiveFunds = sinon.stub().resolves({ activeInboundAmount, activeOutboundAmount })
    })

    afterEach(() => {
      revert()
    })

    it('calculates the outstanding outbound and inbound funds', async () => {
      await worker.checkFundsAreSufficient(blockOrderStub)
      expect(worker.calculateActiveFunds).to.have.been.calledOnce()
    })

    it('gets the addresses to the relayer to check engine balances', async () => {
      await worker.checkFundsAreSufficient(blockOrderStub)
      expect(relayer.paymentChannelNetworkService.getAddress).to.have.been.calledTwice()
      expect(relayer.paymentChannelNetworkService.getAddress).to.have.been.calledWith({ symbol: outboundSymbol })
      expect(relayer.paymentChannelNetworkService.getAddress).to.have.been.calledWith({ symbol: inboundSymbol })
    })

    it('throws if the outbound engine does not exist', () => {
      worker.engines = new Map([ ['BTC', btcEngine] ])
      return expect(worker.checkFundsAreSufficient(blockOrderStub)).to.be.rejectedWith(`No engine available for ${outboundSymbol}`)
    })

    it('throws if the inbound engine does not exist', () => {
      worker.engines = new Map([ ['LTC', ltcEngine] ])
      return expect(worker.checkFundsAreSufficient(blockOrderStub)).to.be.rejectedWith(`No engine available for ${inboundSymbol}`)
    })

    context('blockOrder is a limitOrder', async () => {
      context('blockOrder is a bid', async () => {
        it('checks if the outbound balance in the engine is sufficient', async () => {
          await worker.checkFundsAreSufficient(blockOrderStub)

          expect(ltcEngine.isBalanceSufficient).to.have.been.calledOnce()
          expect(ltcEngine.isBalanceSufficient).to.have.been.calledWith(outboundAddress, Big(outboundAmount).plus(activeOutboundAmount))
        })

        it('checks if the inbound balance in the engine is sufficient', async () => {
          await worker.checkFundsAreSufficient(blockOrderStub)

          expect(btcEngine.isBalanceSufficient).to.have.been.calledOnce()
          expect(btcEngine.isBalanceSufficient).to.have.been.calledWith(inboundAddress, Big(inboundAmount).plus(activeInboundAmount), { outbound: false })
        })

        it('throws if the outbound balance is greater than the amount they have in the outbound channel', () => {
          ltcEngine.isBalanceSufficient.withArgs(outboundAddress, Big(outboundAmount).plus(activeOutboundAmount)).resolves(false)

          return expect(worker.checkFundsAreSufficient(blockOrderStub)).to.be.rejectedWith('Insufficient funds in outbound LTC channel to create order')
        })

        it('throws the inbound balance is greater than the amount the relayer has in the inbound channel', () => {
          btcEngine.isBalanceSufficient.withArgs(inboundAddress, Big(inboundAmount).plus(activeInboundAmount), { outbound: false }).resolves(false)

          return expect(worker.checkFundsAreSufficient(blockOrderStub)).to.be.rejectedWith('Insufficient funds in inbound BTC channel to create order')
        })
      })

      context('blockOrder is an ask', async () => {
        beforeEach(() => {
          blockOrderStub.outboundAmount = '1000000000'
          blockOrderStub.inboundAmount = '2000000000'
          blockOrderStub.outboundSymbol = 'BTC'
          blockOrderStub.inboundSymbol = 'LTC'
          outboundAddress = 'bolt:tttasdf'
          inboundAddress = 'bolt:asdf1234'
        })

        it('checks if the outbound balance in the engine is sufficient', async () => {
          ltcEngine.isBalanceSufficient.withArgs(inboundAddress, Big(blockOrderStub.inboundAmount).plus(activeInboundAmount), { outbound: false }).resolves(true)
          btcEngine.isBalanceSufficient.withArgs(outboundAddress, Big(blockOrderStub.outboundAmount).plus(activeOutboundAmount)).resolves(true)

          await worker.checkFundsAreSufficient(blockOrderStub)

          expect(btcEngine.isBalanceSufficient).to.have.been.calledOnce()
          expect(btcEngine.isBalanceSufficient).to.have.been.calledWith(outboundAddress, Big(blockOrderStub.outboundAmount).plus(activeOutboundAmount))
        })

        it('checks if the inbound balance in the engine is sufficient', async () => {
          ltcEngine.isBalanceSufficient.withArgs(inboundAddress, Big(blockOrderStub.inboundAmount).plus(activeInboundAmount), { outbound: false }).resolves(true)
          btcEngine.isBalanceSufficient.withArgs(outboundAddress, Big(blockOrderStub.outboundAmount).plus(activeOutboundAmount)).resolves(true)

          await worker.checkFundsAreSufficient(blockOrderStub)

          expect(ltcEngine.isBalanceSufficient).to.have.been.calledOnce()
          expect(ltcEngine.isBalanceSufficient).to.have.been.calledWith(inboundAddress, Big(blockOrderStub.inboundAmount).plus(activeInboundAmount), { outbound: false })
        })

        it('throws if the inboundAmount is greater than the amount they have in the inbound channel', () => {
          ltcEngine.isBalanceSufficient.withArgs(inboundAddress, Big(blockOrderStub.inboundAmount).plus(activeInboundAmount), { outbound: false }).resolves(false)
          btcEngine.isBalanceSufficient.withArgs(outboundAddress, Big(blockOrderStub.outboundAmount).plus(activeOutboundAmount)).resolves(true)

          return expect(worker.checkFundsAreSufficient(blockOrderStub)).to.be.rejectedWith('Insufficient funds in inbound LTC channel to create order')
        })

        it('throws if the outbound is greater than the amount the relayer has in the outbound channel', () => {
          ltcEngine.isBalanceSufficient.withArgs(inboundAddress, Big(blockOrderStub.inboundAmount).plus(activeInboundAmount), { outbound: false }).resolves(true)
          btcEngine.isBalanceSufficient.withArgs(outboundAddress, Big(blockOrderStub.outboundAmount).plus(activeOutboundAmount)).resolves(false)

          return expect(worker.checkFundsAreSufficient(blockOrderStub)).to.be.rejectedWith('Insufficient funds in outbound BTC channel to create order')
        })
      })
    })

    context('blockOrder is a marketOrder', async () => {
      beforeEach(() => {
        blockOrderStub.isMarketOrder = true
        blockOrderStub.isBid = true
        orderbook.getAveragePrice.resolves(Big(2))
        blockOrderStub.amount = Big(2)
        blockOrderStub.counterCurrencyConfig = { quantumsPerCommon: '1000' }
      })
      context('blockOrder is a bid', async () => {
        beforeEach(() => {
          blockOrderStub.inverseSide = 'ASK'
          ltcEngine.isBalanceSufficient.withArgs(outboundAddress, Big(4000).plus(activeOutboundAmount)).resolves(true)
          btcEngine.isBalanceSufficient.withArgs(inboundAddress, Big(blockOrderStub.baseAmount).plus(activeInboundAmount), { outbound: false }).resolves(true)
        })

        it('throws if the market is not in the orderbook', () => {
          worker.orderbooks = new Map([['BTC/XYZ', {}]])
          const errorMessage = `${blockOrderStub.marketName} is not being tracked as a market. Configure sparkswapd to track ${blockOrderStub.marketName} using the MARKETS environment variable.`
          return expect(worker.checkFundsAreSufficient(blockOrderStub)).to.be.rejectedWith(errorMessage)
        })

        it('gets the averagePrice of orders given the side and the depth', async () => {
          await worker.checkFundsAreSufficient(blockOrderStub)
          expect(orderbook.getAveragePrice).to.have.been.calledOnce()
          expect(orderbook.getAveragePrice).to.have.been.calledWith('ASK', blockOrderStub.baseAmount)
        })

        it('checks if the outbound balance in the engine is sufficient', async () => {
          await worker.checkFundsAreSufficient(blockOrderStub)

          expect(ltcEngine.isBalanceSufficient).to.have.been.calledOnce()
          expect(ltcEngine.isBalanceSufficient).to.have.been.calledWith(outboundAddress, Big(4000).plus(activeOutboundAmount))
        })

        it('checks if the inbound balance in the engine is sufficient', async () => {
          await worker.checkFundsAreSufficient(blockOrderStub)

          expect(btcEngine.isBalanceSufficient).to.have.been.calledOnce()
          expect(btcEngine.isBalanceSufficient).to.have.been.calledWith(inboundAddress, Big(blockOrderStub.baseAmount).plus(activeInboundAmount), { outbound: false })
        })

        it('throws if the outbound balance is greater than the amount they have in the outbound channel', () => {
          ltcEngine.isBalanceSufficient.withArgs(outboundAddress, Big(4000).plus(activeOutboundAmount)).resolves(false)

          return expect(worker.checkFundsAreSufficient(blockOrderStub)).to.be.rejectedWith('Insufficient funds in outbound LTC channel to create order')
        })

        it('throws the inbound balance is greater than the amount the relayer has in the inbound channel', () => {
          btcEngine.isBalanceSufficient.withArgs(inboundAddress, Big(blockOrderStub.baseAmount).plus(activeInboundAmount), { outbound: false }).resolves(false)

          return expect(worker.checkFundsAreSufficient(blockOrderStub)).to.be.rejectedWith('Insufficient funds in inbound BTC channel to create order')
        })
      })

      context('blockOrder is an ask', async () => {
        beforeEach(() => {
          blockOrderStub.inverseSide = 'BID'
          blockOrderStub.outboundAmount = '1000000000'
          blockOrderStub.inboundAmount = '2000000000'
          blockOrderStub.outboundSymbol = 'BTC'
          blockOrderStub.inboundSymbol = 'LTC'
          outboundAddress = 'bolt:tttasdf'
          inboundAddress = 'bolt:asdf1234'
          btcEngine.isBalanceSufficient.withArgs(outboundAddress, Big(4000).plus(activeOutboundAmount)).resolves(true)
          ltcEngine.isBalanceSufficient.withArgs(inboundAddress, Big(blockOrderStub.baseAmount).plus(activeInboundAmount), { outbound: false }).resolves(true)
        })

        it('gets the averagePrice of orders given the side and the depth', async () => {
          await worker.checkFundsAreSufficient(blockOrderStub)
          expect(orderbook.getAveragePrice).to.have.been.calledOnce()
          expect(orderbook.getAveragePrice).to.have.been.calledWith('BID', blockOrderStub.baseAmount)
        })

        it('checks if the outbound balance in the engine is sufficient', async () => {
          await worker.checkFundsAreSufficient(blockOrderStub)

          expect(btcEngine.isBalanceSufficient).to.have.been.calledOnce()
          expect(btcEngine.isBalanceSufficient).to.have.been.calledWith(outboundAddress, Big(4000).plus(activeOutboundAmount))
        })

        it('checks if the inbound balance in the engine is sufficient', async () => {
          await worker.checkFundsAreSufficient(blockOrderStub)

          expect(ltcEngine.isBalanceSufficient).to.have.been.calledOnce()
          expect(ltcEngine.isBalanceSufficient).to.have.been.calledWith(inboundAddress, Big(blockOrderStub.baseAmount).plus(activeInboundAmount), { outbound: false })
        })

        it('throws if the inboundAmount is greater than the amount they have in the inbound channel', () => {
          ltcEngine.isBalanceSufficient.withArgs(inboundAddress, Big(blockOrderStub.baseAmount).plus(activeInboundAmount), { outbound: false }).resolves(false)
          btcEngine.isBalanceSufficient.withArgs(outboundAddress, Big(4000).plus(activeOutboundAmount)).resolves(true)

          return expect(worker.checkFundsAreSufficient(blockOrderStub)).to.be.rejectedWith('Insufficient funds in inbound LTC channel to create order')
        })

        it('throws if the outbound is greater than the amount the relayer has in the outbound channel', () => {
          ltcEngine.isBalanceSufficient.withArgs(inboundAddress, Big(blockOrderStub.baseAmount).plus(activeInboundAmount), { outbound: false }).resolves(true)
          btcEngine.isBalanceSufficient.withArgs(outboundAddress, Big(4000).plus(activeOutboundAmount)).resolves(false)

          return expect(worker.checkFundsAreSufficient(blockOrderStub)).to.be.rejectedWith('Insufficient funds in outbound BTC channel to create order')
        })
      })
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
    let fakeErr
    let fakeId

    beforeEach(() => {
      store.get.callsArgWithAsync(1, null, blockOrder)
      store.put.callsArgAsync(2)

      fakeBlockOrder = {
        id: blockOrderId,
        key: 'fakeVal',
        value: 'fakeVal',
        fail: sinon.stub()
      }

      BlockOrder.fromStore.resolves(fakeBlockOrder)
      worker = new BlockOrderWorker({ orderbooks, store, logger, relayer, engines })
      worker.cancelOutstandingOrders = sinon.stub().resolves()
      fakeErr = new Error('fake')
      fakeId = 'myid'
    })

    it('retrieves a block order from the store', async () => {
      await worker.failBlockOrder(fakeId, fakeErr)

      expect(BlockOrder.fromStore).to.have.been.calledOnce()
      expect(BlockOrder.fromStore).to.have.been.calledWith(store, fakeId)
    })

    it('cancels outstanding orders associated with the block order', async () => {
      await worker.failBlockOrder(fakeId, fakeErr)

      expect(worker.cancelOutstandingOrders).to.have.been.calledOnce()
      expect(worker.cancelOutstandingOrders).to.have.been.calledWith(fakeBlockOrder)
    })

    it('logs error if cancelling outstanding orders fails', async () => {
      const fakeError = new Error('myerror')
      const fakeId = 'myid'

      worker.cancelOutstandingOrders.rejects(fakeError)

      try {
        await worker.cancelBlockOrder(fakeId)
      } catch (e) {
        expect(logger.error).to.have.been.calledWith('Failed to cancel all orders for block order: ')
        return
      }

      throw new Error('Expected relayer cancellation to throw an error')
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
    let fillsStore
    let ordersStore
    let worker
    let blockOrder
    let blockOrderId = 'fakeId'

    beforeEach(() => {
      ordersStore = {
        put: sinon.stub()
      }
      fillsStore = {
        put: sinon.stub()
      }
      blockOrder = {
        id: blockOrderId,
        populateFills: sinon.stub().resolves(),
        populateOrders: sinon.stub().resolves()
      }
      store.sublevel.withArgs('orders').returns(ordersStore)
      store.sublevel.withArgs('fills').returns(fillsStore)
      BlockOrder.fromStore.resolves(blockOrder)
      worker = new BlockOrderWorker({ orderbooks, store, logger, relayer, engines })
    })

    it('retrieves a block order from the store', async () => {
      const fakeId = 'myid'
      await worker.getBlockOrder(fakeId)

      expect(BlockOrder.fromStore).to.have.been.calledOnce()
      expect(BlockOrder.fromStore).to.have.been.calledWith(store)
    })

    it('populates orders associated with the blockOrder', async () => {
      const fakeId = 'myid'
      await worker.getBlockOrder(fakeId)

      expect(blockOrder.populateOrders).to.have.been.calledOnce()
      expect(blockOrder.populateOrders).to.have.been.calledWith(ordersStore)
    })

    it('populates fills associated with the blockOrder', async () => {
      const fakeId = 'myid'
      await worker.getBlockOrder(fakeId)

      expect(blockOrder.populateFills).to.have.been.calledOnce()
      expect(blockOrder.populateFills).to.have.been.calledWith(fillsStore)
    })

    it('returns the blockOrder', async () => {
      const fakeId = 'myid'
      const res = await worker.getBlockOrder(fakeId)

      expect(res).to.eql(blockOrder)
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
    let identityStub
    let blockOrderFail
    let fakeBlockOrder

    beforeEach(() => {
      orders = [
        {
          order: {
            orderId: 'someId'
          },
          state: 'created'
        }
      ]
      blockOrderCancel = sinon.stub()
      blockOrderFail = sinon.stub()
      fakeBlockOrder = {
        id: blockOrderId,
        cancel: blockOrderCancel,
        key: blockOrderKey,
        value: blockOrderValue,
        orders,
        openOrders: orders,
        fail: blockOrderFail
      }
      BlockOrder.fromStore.resolves(fakeBlockOrder)
      identityStub = sinon.stub()

      relayer.makerService = {
        cancelOrder: sinon.stub().resolves()
      }
      relayer.identity = {
        authorize: identityStub.returns('identity')
      }

      worker = new BlockOrderWorker({ orderbooks, store, logger, relayer, engines })
      worker.cancelOutstandingOrders = sinon.stub().resolves()
    })

    it('retrieves a block order from the store', async () => {
      const fakeId = 'myid'
      await worker.cancelBlockOrder(fakeId)

      expect(BlockOrder.fromStore).to.have.been.calledOnce()
      expect(BlockOrder.fromStore).to.have.been.calledWith(store, fakeId)
    })

    it('cancels outstanding orders on the relayer', async () => {
      const fakeId = 'myid'
      await worker.cancelBlockOrder(fakeId)

      expect(worker.cancelOutstandingOrders).to.have.been.calledOnce()
      expect(worker.cancelOutstandingOrders).to.have.been.calledWith(fakeBlockOrder)
    })

    it('fails the block order if relayer cancellation fails', async () => {
      const fakeError = new Error('myerror')
      const fakeId = 'myid'

      worker.cancelOutstandingOrders.rejects(fakeError)

      try {
        await worker.cancelBlockOrder(fakeId)
      } catch (e) {
        expect(blockOrderFail).to.have.been.calledOnce()
        expect(store.put).to.have.been.calledOnce()
        expect(store.put).to.have.been.calledWith(blockOrderKey, blockOrderValue)
        expect(e).to.be.eql(fakeError)
        return
      }

      throw new Error('Expected relayer cancellation to throw an error')
    })

    it('updates the block order to cancelled status', async () => {
      const fakeId = 'myid'
      await worker.cancelBlockOrder(fakeId)

      expect(blockOrderCancel).to.have.been.calledOnce()
    })

    it('saves the updated block order with the cancelled status', async () => {
      const fakeId = 'myid'
      await worker.cancelBlockOrder(fakeId)

      expect(store.put).to.have.been.calledOnce()
      expect(store.put).to.have.been.calledWith(blockOrderKey, blockOrderValue)
    })
  })

  describe('#cancelActiveOrders', () => {
    let worker
    let getBlockOrders
    let market
    let cancelBlockOrder
    let unsuccessfulBlockOrder
    let successfulBlockOrder

    beforeEach(() => {
      market = 'BTC/LTC'
      unsuccessfulBlockOrder = {
        isActive: true,
        id: 'unsuccessfulId'
      }
      successfulBlockOrder = {
        isActive: true,
        id: 'successfulId'
      }
      cancelBlockOrder = sinon.stub()
      cancelBlockOrder.withArgs(unsuccessfulBlockOrder.id).rejects()
      cancelBlockOrder.withArgs(successfulBlockOrder.id).resolves()

      getBlockOrders = sinon.stub().resolves([successfulBlockOrder, unsuccessfulBlockOrder])

      worker = new BlockOrderWorker({ orderbooks, store, logger, relayer, engines })
      worker.getBlockOrders = getBlockOrders
      worker.cancelBlockOrder = cancelBlockOrder
    })

    it('gets all block orders', async () => {
      await worker.cancelActiveOrders(market)

      expect(getBlockOrders).to.have.been.called()
      expect(getBlockOrders).to.have.been.calledWith(market)
    })

    it('filters out inactive block orders', async () => {
      const inactiveBlockOrder = {
        isActive: false,
        id: 'inactiveBlockOrder'
      }
      getBlockOrders.resolves([successfulBlockOrder, unsuccessfulBlockOrder, inactiveBlockOrder])
      await worker.cancelActiveOrders(market)

      expect(cancelBlockOrder).to.not.have.been.calledWith(inactiveBlockOrder.id)
    })

    it('attempts to cancel each block order', async () => {
      await worker.cancelActiveOrders(market)

      expect(cancelBlockOrder).to.have.been.calledWith(successfulBlockOrder.id)
      expect(cancelBlockOrder).to.have.been.calledWith(unsuccessfulBlockOrder.id)
    })

    it('returns successfully cancelled block order ids', async () => {
      const res = await worker.cancelActiveOrders(market)

      expect(res.cancelledOrders).to.eql(['successfulId'])
    })

    it('returns unsuccessfully cancelled block order ids', async () => {
      const res = await worker.cancelActiveOrders(market)

      expect(res.failedToCancelOrders).to.eql(['unsuccessfulId'])
    })
  })

  describe('#cancelOutstandingOrders', () => {
    let worker
    let blockOrder
    let blockOrderId = 'fakeId'
    let blockOrderKey = blockOrderId
    let blockOrderValue = blockOrder
    let orders
    let fakeAuth

    beforeEach(() => {
      orders = [
        {
          order: {
            orderId: 'someId'
          },
          state: 'created'
        }
      ]
      blockOrder = {
        id: blockOrderId,
        key: blockOrderKey,
        value: blockOrderValue,
        populateOrders: sinon.stub().resolves(),
        orders,
        openOrders: orders
      }
      fakeAuth = 'identity'

      relayer.makerService = {
        cancelOrder: sinon.stub().resolves()
      }
      relayer.identity = {
        authorize: sinon.stub().returns(fakeAuth)
      }

      worker = new BlockOrderWorker({ orderbooks, store, logger, relayer, engines })
    })

    it('populates orders for the blockOrder', async () => {
      await worker.cancelOutstandingOrders(blockOrder)
      expect(blockOrder.populateOrders).to.have.been.calledWith(worker.ordersStore)
    })

    it('authorizes the request', async () => {
      await worker.cancelOutstandingOrders(blockOrder)
      expect(relayer.identity.authorize).to.have.been.calledOnce()
    })

    it('cancels all of the orders on the relayer', async () => {
      await worker.cancelOutstandingOrders(blockOrder)

      expect(relayer.makerService.cancelOrder).to.have.been.calledOnce()
      expect(relayer.makerService.cancelOrder).to.have.been.calledWith(sinon.match({ orderId: orders[0].order.orderId }), fakeAuth)
    })
  })

  describe('#workBlockOrder', () => {
    let worker
    let blockOrder
    let updatedBlockOrder
    let getBlockOrderStub

    beforeEach(() => {
      worker = new BlockOrderWorker({ orderbooks, store, logger, relayer, engines })
      blockOrder = {
        marketName: 'BTC/LTC',
        price: Big('1000'),
        isInWorkableState: true
      }
      updatedBlockOrder = Object.assign({}, blockOrder)
      getBlockOrderStub = sinon.stub().resolves(updatedBlockOrder)
      worker.getBlockOrder = getBlockOrderStub
    })

    it('pulls the updated order', async () => {
      worker.workLimitBlockOrder = sinon.stub().resolves()
      worker.workMarketBlockOrder = sinon.stub().resolves()
      await worker.workBlockOrder(blockOrder, Big('100'))

      expect(getBlockOrderStub).to.have.been.calledOnce()
      expect(getBlockOrderStub).to.have.been.calledWith(updatedBlockOrder.id)
    })

    it('returns early if blockOrder is not in a state to be worked', async () => {
      updatedBlockOrder.isInWorkableState = false
      worker.workMarketBlockOrder = sinon.stub().resolves()
      worker.workLimitBlockOrder = sinon.stub().resolves()

      await worker.workBlockOrder(blockOrder, Big('100'))

      expect(worker.workMarketBlockOrder).to.not.have.been.called()
      expect(worker.workLimitBlockOrder).to.not.have.been.called()
    })

    it('errors if the market is not supported', () => {
      blockOrder.marketName = 'ABC/XYC'
      blockOrder.baseSymbol = 'ABC'
      blockOrder.counterSymbol = 'XYZ'

      expect(worker.workBlockOrder(blockOrder, Big('100'))).to.be.rejectedWith(Error)
    })

    it('sends market orders to #workMarketBlockOrder', async () => {
      updatedBlockOrder.isMarketOrder = true
      worker.workMarketBlockOrder = sinon.stub().resolves()

      await worker.workBlockOrder(blockOrder, Big('100'))

      expect(worker.workMarketBlockOrder).to.have.been.calledOnce()
      expect(worker.workMarketBlockOrder).to.have.been.calledWith(updatedBlockOrder, Big('100'))
    })

    it('sends limit orders to #workLimitBlockOrder', async () => {
      worker.workLimitBlockOrder = sinon.stub().resolves()

      await worker.workBlockOrder(blockOrder, Big('100'))

      expect(worker.workLimitBlockOrder).to.have.been.calledOnce()
      expect(worker.workLimitBlockOrder).to.have.been.calledWith(sinon.match.same(updatedBlockOrder), Big('100'))
    })
  })

  describe('#calculateActiveFunds', () => {
    let worker
    let marketName
    let side
    let askStub
    let bidStub
    let anotherBidStub
    let blockOrders
    let blockOrdersStub

    beforeEach(() => {
      marketName = 'BTC/LTC'
      side = 'BID'
      askStub = {
        side: 'ASK',
        populateOrders: sinon.stub().resolves(),
        populateFills: sinon.stub().resolves(),
        activeOutboundAmount: sinon.stub().returns(Big('1000')),
        activeInboundAmount: sinon.stub().returns(Big('1000'))
      }
      bidStub = {
        side: 'BID',
        populateOrders: sinon.stub().resolves(),
        populateFills: sinon.stub().resolves(),
        activeOutboundAmount: sinon.stub().returns(Big('3000')),
        activeInboundAmount: sinon.stub().returns(Big('4000'))

      }
      anotherBidStub = {
        side: 'BID',
        populateOrders: sinon.stub().resolves(),
        populateFills: sinon.stub().resolves(),
        activeOutboundAmount: sinon.stub().returns(Big('5000')),
        activeInboundAmount: sinon.stub().returns(Big('5000'))
      }
      blockOrders = [askStub, bidStub, anotherBidStub]
      blockOrdersStub = sinon.stub().resolves(blockOrders)
      worker = new BlockOrderWorker({ orderbooks, store, logger, relayer, engines })
      worker.getBlockOrders = blockOrdersStub
    })

    it('gets blockOrders for the market', async () => {
      await worker.calculateActiveFunds(marketName, side)

      expect(blockOrdersStub).to.have.been.calledOnce()
      expect(blockOrdersStub).to.have.been.calledWith(marketName)
    })

    it('filters the blockOrders by side', async () => {
      await worker.calculateActiveFunds(marketName, side)

      expect(bidStub.populateOrders).to.have.been.calledOnce()
      expect(bidStub.populateFills).to.have.been.calledOnce()
      expect(anotherBidStub.populateOrders).to.have.been.calledOnce()
      expect(anotherBidStub.populateFills).to.have.been.calledOnce()
      expect(askStub.populateOrders).to.not.have.been.called()
      expect(askStub.populateFills).to.not.have.been.called()
    })

    it('populates orders and fills on the blockOrder', async () => {
      await worker.calculateActiveFunds(marketName, side)

      expect(bidStub.populateOrders).to.have.been.calledOnce()
      expect(bidStub.populateFills).to.have.been.calledOnce()
      expect(anotherBidStub.populateOrders).to.have.been.calledOnce()
      expect(anotherBidStub.populateFills).to.have.been.calledOnce()
    })

    it('gets the active inbound and outbound amounts each blockOrder', async () => {
      await worker.calculateActiveFunds(marketName, side)

      expect(bidStub.activeOutboundAmount).to.have.been.calledOnce()
      expect(bidStub.activeInboundAmount).to.have.been.calledOnce()
      expect(anotherBidStub.activeOutboundAmount).to.have.been.calledOnce()
      expect(anotherBidStub.activeInboundAmount).to.have.been.calledOnce()
    })

    it('returns the active inbound and outbound amounts', async () => {
      const res = await worker.calculateActiveFunds(marketName, side)

      expect(res.activeOutboundAmount).to.eql(Big('8000'))
      expect(res.activeInboundAmount).to.eql(Big('9000'))
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
      worker._placeOrders = sinon.stub()
      blockOrder = {
        id: 'fakeId',
        marketName: 'BTC/LTC',
        baseSymbol: 'BTC',
        counterSymbol: 'LTC',
        side: 'BID',
        inverseSide: 'ASK',
        timeInForce: 'GTC',
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
      await worker.workLimitBlockOrder(blockOrder, Big('100000000000'))

      expect(orderbooks.get('BTC/LTC').getBestOrders).to.have.been.calledOnce()
      expect(orderbooks.get('BTC/LTC').getBestOrders).to.have.been.calledWith(sinon.match({ side: 'ASK', depth: '100000000000', quantumPrice: '1000.00000000000000000' }))
    })

    it('fills as many orders as possible at the given price or better', async () => {
      await worker.workLimitBlockOrder(blockOrder, Big('100000000000'))

      expect(worker._fillOrders).to.have.been.calledOnce()
      expect(worker._fillOrders.args[0][0]).to.be.eql(blockOrder)
      expect(worker._fillOrders.args[0][1]).to.be.eql(orders)
      expect(worker._fillOrders.args[0][2]).to.be.eql('100000000000')
    })

    it('places an order for the remaining amount', async () => {
      await worker.workLimitBlockOrder(blockOrder, Big('100000000000'))

      expect(worker._placeOrders).to.have.been.calledOnce()
      expect(worker._placeOrders.args[0][0]).to.be.eql(blockOrder)
      expect(worker._placeOrders.args[0][1]).to.be.eql('10000000000')
    })

    it('does not place an order if it can be filled with fills only', async () => {
      orders.push({ orderId: '1', baseAmount: '10000000000' })
      orderbooks.get('BTC/LTC').getBestOrders.resolves({
        orders,
        depth: '190000000000'
      })

      await worker.workLimitBlockOrder(blockOrder, Big('100000000000'))

      expect(worker._fillOrders.args[0][1]).to.have.lengthOf(2)
      expect(worker._placeOrders).to.not.have.been.called()
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
        marketName: 'BTC/LTC',
        inverseSide: 'ASK'
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
      await worker.workMarketBlockOrder(blockOrder, Big('100'))

      expect(orderbooks.get('BTC/LTC').getBestOrders).to.have.been.calledOnce()
      expect(orderbooks.get('BTC/LTC').getBestOrders).to.have.been.calledWith(sinon.match({ side: 'ASK', depth: '100' }))
    })

    it('throws if insufficient depth is in the market', () => {
      orderbooks.get('BTC/LTC').getBestOrders.resolves({
        orders: [],
        depth: '0'
      })

      return expect(worker.workMarketBlockOrder(blockOrder, Big('100'))).to.eventually.be.rejectedWith('Insufficient depth in ASK to fill 100')
    })

    it('fills the orders to the given depth', async () => {
      await worker.workMarketBlockOrder(blockOrder, Big('100'))

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
          orders: []
        }

        worker = new BlockOrderWorker({ orderbooks, store, logger, relayer, engines })
        worker.blockOrder = blockOrder
        worker.getBlockOrder = getBlockOrderStub.resolves(blockOrder)
      })

      it('gets a block order by id', async () => {
        await worker.checkBlockOrderCompletion(blockOrder.id).catch(() => {})
        expect(getBlockOrderStub).to.have.been.calledWith(blockOrder.id)
      })
    })

    context('block order with orders', () => {
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
          orders: orderStateMachines,
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
          orders: [
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
          orders: [],
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
          orders: [],
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
          orders: orderStateMachines,
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
          orders: orderStateMachines,
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
          orders: [
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
    let getRecords
    let ordersByOrderId

    beforeEach(() => {
      onceStub = sinon.stub()
      removeAllListenersStub = sinon.stub()
      getRecords = sinon.stub()
      Order.fromStorage = {
        bind: sinon.stub()
      }
      ordersByOrderId = { range: sinon.stub() }
      getRecords = sinon.stub().resolves([])
      BlockOrderWorker.__set__('getRecords', getRecords)
      worker = new BlockOrderWorker({ orderbooks, store, logger, relayer, engines })
      worker.ordersByOrderId = ordersByOrderId
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

      return expect(worker._fillOrders(blockOrder, orders, targetDepth)).to.eventually.be.rejectedWith('No engine available')
    })

    it('throws if the order being filled is the users own order', () => {
      getRecords.resolves([{ orderId: '1' }])
      const worker = new BlockOrderWorker({ orderbooks, store, logger, relayer, engines })
      worker.ordersByOrderId = ordersByOrderId
      return expect(worker._fillOrders(blockOrder, orders, targetDepth)).to.eventually.be.rejectedWith(`Cannot fill own order 1`)
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
        fill = {
          id: 'anotherId',
          once: onceStub,
          removeAllListeners: removeAllListenersStub,
          fill: {
            fillAmount: '100'
          },
          shouldRetry: sinon.stub().returns(true)
        }
        FillStateMachine.create.resolves(fill)
        failBlockOrderStub = sinon.stub().resolves(true)
        worker.failBlockOrder = failBlockOrderStub
      })

      it('registers an event on an order for order rejection', async () => {
        await worker._fillOrders(blockOrder, orders, targetDepth)
        expect(onceStub).to.have.been.calledWith('reject', sinon.match.func)
      })

      it('removes all listeners if the call is rejected', async () => {
        await worker._fillOrders(blockOrder, orders, targetDepth)
        worker.workBlockOrder = sinon.stub().resolves(true)
        await onceStub.args[1][1]()
        expect(fill.removeAllListeners).to.have.been.calledOnce()
      })

      it('reworks a blockOrder if the order is not in a state to be filled', async () => {
        await worker._fillOrders(blockOrder, orders, targetDepth)
        worker.workBlockOrder = sinon.stub().resolves(true)
        await onceStub.args[1][1]()
        expect(worker.workBlockOrder).to.have.been.calledWith(blockOrder, Big('100'))
      })

      it('fails a block order if the call is rejected for reason other than the order is in the wrong state', async () => {
        fill.shouldRetry.returns(false)
        FillStateMachine.create.resolves(fill)
        await worker._fillOrders(blockOrder, orders, targetDepth)
        await onceStub.args[1][1]()
        expect(failBlockOrderStub).to.have.been.calledOnce()
        expect(failBlockOrderStub).to.have.been.calledWith(blockOrder.id, fill.fill.error)
      })

      it('catches an exception if failBlockOrder fails', async () => {
        fill.shouldRetry.returns(false)
        FillStateMachine.create.resolves(fill)
        failBlockOrderStub.rejects()
        await worker._fillOrders(blockOrder, orders, targetDepth)
        await onceStub.args[1][1]()
        expect(failBlockOrderStub).to.have.been.calledOnce()
        expect(loggerErrorStub).to.have.been.calledWith(sinon.match('BlockOrder failed'), sinon.match.any)
      })
    })

    describe('cancel event', async () => {
      let cancelListener

      it('registers an event on an order for order cancellation', async () => {
        await worker._fillOrders(blockOrder, orders, targetDepth)

        expect(onceStub).to.have.been.calledWith('cancel', sinon.match.func)
      })

      it('registers an event on an order for order cancellation', async () => {
        await worker._fillOrders(blockOrder, orders, targetDepth)
        cancelListener = onceStub.withArgs('cancel').args[1][1]
        await cancelListener()

        expect(removeAllListenersStub).to.have.been.called()
      })
    })
  })

  describe('#applyOsmListeners', () => {
    let worker
    let blockOrder
    let order
    let onceStub
    let removeAllListenersStub
    let shouldRetryStub

    beforeEach(async () => {
      onceStub = sinon.stub()
      removeAllListenersStub = sinon.stub()
      shouldRetryStub = sinon.stub()
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
          orderId: 'orderid',
          baseAmount: '100',
          fillAmount: '90'
        },
        removeAllListeners: removeAllListenersStub,
        shouldRetry: shouldRetryStub
      }

      await worker.applyOsmListeners(order, blockOrder)
    })

    describe('complete event', () => {
      let blockOrderCompleteStub
      let completeListener

      beforeEach(() => {
        blockOrderCompleteStub = sinon.stub().resolves(true)
        worker.checkBlockOrderCompletion = blockOrderCompleteStub
        completeListener = onceStub.withArgs('complete').args[0][1]
      })

      it('registers an event on an order for order completion', async () => {
        expect(onceStub).to.have.been.calledWith('complete', sinon.match.func)
      })

      it('attempts to complete a block order', async () => {
        await completeListener()
        expect(blockOrderCompleteStub).to.have.been.calledOnce()
      })

      it('catches an exception if checkBlockOrderCompletion fails', async () => {
        blockOrderCompleteStub.rejects()
        await completeListener()
        expect(blockOrderCompleteStub).to.have.been.calledOnce()
        expect(loggerErrorStub).to.have.been.calledWith(sinon.match('BlockOrder failed'), sinon.match.any)
      })
    })

    describe('execute event', () => {
      let workBlockOrderStub
      let executeListener

      beforeEach(() => {
        workBlockOrderStub = sinon.stub().resolves()
        worker.workBlockOrder = workBlockOrderStub
        executeListener = onceStub.withArgs('before:execute').args[0][1]
      })

      it('registers an event on an order for order execution', async () => {
        expect(onceStub).to.have.been.calledWith('before:execute', sinon.match.func)
      })

      it('works the block order with the remaining base amount', async () => {
        await executeListener()
        expect(workBlockOrderStub).to.have.been.calledOnce()
        expect(workBlockOrderStub).to.have.been.calledWith(blockOrder)
        expect(workBlockOrderStub.args[0][1].toString()).to.be.eql('10')
      })

      it('does not work the block order if the order was completely filled', async () => {
        order.order.fillAmount = '100'
        await executeListener()
        expect(workBlockOrderStub).to.not.have.been.calledOnce()
      })

      it('fails the block order if workBlockOrder fails', async () => {
        worker.failBlockOrder = sinon.stub()
        const fakeErr = new Error('my error')
        workBlockOrderStub.rejects(fakeErr)

        await executeListener()

        expect(workBlockOrderStub).to.have.been.calledOnce()
        expect(worker.failBlockOrder).to.have.been.calledOnce()
        expect(worker.failBlockOrder).to.have.been.calledWith(blockOrder.id, fakeErr)
      })
    })

    describe('reject event', () => {
      let workBlockOrderStub
      let failBlockOrderStub
      let relayerIsAvailableStub
      let getBlockOrderStub
      let updatedBlockOrder
      let rejectListener
      let retry

      beforeEach(() => {
        workBlockOrderStub = sinon.stub().resolves()
        worker.workBlockOrder = workBlockOrderStub

        failBlockOrderStub = sinon.stub().resolves(true)
        worker.failBlockOrder = failBlockOrderStub

        relayerIsAvailableStub = sinon.stub().resolves(true)
        worker.relayerIsAvailable = relayerIsAvailableStub

        updatedBlockOrder = Object.assign({}, blockOrder)
        getBlockOrderStub = sinon.stub().resolves(updatedBlockOrder)
        worker.getBlockOrder = getBlockOrderStub

        retry = sinon.stub()
        BlockOrderWorker.__set__('retry', retry)

        rejectListener = onceStub.withArgs('reject').args[0][1]
      })

      it('registers an event on an order for order rejection', async () => {
        expect(onceStub).to.have.been.calledWith('reject', sinon.match.func)
      })

      context('should retry', () => {
        beforeEach(() => {
          order.shouldRetry.returns(true)
        })

        it('retries the block order after the relayer has gone down and becomes available', async () => {
          await rejectListener()
          expect(retry).to.have.been.calledOnce()
          expect(retry).to.have.been.calledWith(sinon.match.func, sinon.match.string, sinon.match.number, sinon.match.number)
        })

        it('works the correct block order when it should retry', async () => {
          relayerIsAvailableStub.resolves(true)

          await rejectListener()

          const retryBlockOrderStub = retry.args[0][0]
          await retryBlockOrderStub()

          expect(workBlockOrderStub).to.have.been.calledOnce()
          expect(workBlockOrderStub).to.have.been.calledWith(updatedBlockOrder, Big(order.order.baseAmount))
        })

        it('fails the block order when the retry logic throws', async () => {
          order.order.error = 'an error'
          retry.throws()
          await rejectListener()

          expect(failBlockOrderStub).to.have.been.calledOnce()
          expect(failBlockOrderStub).to.have.been.calledWith(blockOrder.id, 'an error')
        })

        it('does not try re-placing the block order when relayer is not available', async () => {
          relayerIsAvailableStub.resolves(false)

          await rejectListener()
          const retryStub = retry.args[0][0]
          expect(retryStub()).to.have.been.rejectedWith('not available')
        })
      })

      context('should NOT retry', () => {
        beforeEach(() => {
          order.shouldRetry.returns(false)
        })

        it('does not try to re-work block orders', async () => {
          await rejectListener()

          expect(retry).to.not.have.been.called()
        })

        it('fails the block order when it should not retry', async () => {
          order.order.error = 'an error'

          await rejectListener()
          expect(failBlockOrderStub).to.have.been.calledOnce()
          expect(failBlockOrderStub).to.have.been.calledWith(blockOrder.id, 'an error')
        })
      })

      it('catches an exception if failBlockOrder fails', async () => {
        failBlockOrderStub.rejects()
        await rejectListener()
        expect(failBlockOrderStub).to.have.been.calledOnce()
        expect(loggerErrorStub).to.have.been.calledWith(sinon.match('BlockOrder failed'), sinon.match.any)
      })
    })

    describe('cancel event', () => {
      let cancelListener

      beforeEach(() => {
        cancelListener = onceStub.withArgs('cancel').args[0][1]
      })

      it('registers an event on an order for order cancellation', async () => {
        expect(onceStub).to.have.been.calledWith('cancel', sinon.match.func)
      })

      it('registers an event on an order for order cancellation', async () => {
        await cancelListener()

        expect(removeAllListenersStub).to.have.been.called()
      })
    })
  })

  describe('#_placeOrders', () => {
    let worker
    let blockOrder

    beforeEach(() => {
      worker = new BlockOrderWorker({ orderbooks, store, logger, relayer, engines })
      worker._placeOrder = sinon.stub()

      blockOrder = {
        id: 'fakeId',
        baseSymbol: 'BTC',
        counterSymbol: 'LTC',
        quantumPrice: '1000'
      }
    })

    it('throws if one of the engines is missing', () => {
      blockOrder.counterSymbol = 'XYZ'

      return expect(() => worker._placeOrders(blockOrder, '100')).to.throw('No engine available')
    })

    it('creates a single order order if the order size is below the max', () => {
      worker._placeOrders(blockOrder, '100')

      expect(worker._placeOrder).to.have.been.calledOnce()
      expect(worker._placeOrder).to.have.been.calledWith(blockOrder, '100')
    })

    it('creates multiple orders if the base size is above the max', () => {
      blockOrder.quantumPrice = '1'

      worker._placeOrders(blockOrder, Big(engineBtc.maxPaymentSize).plus(10).toString())

      expect(worker._placeOrder).to.have.been.calledTwice()
      expect(worker._placeOrder.firstCall).to.have.been.calledWith(blockOrder, engineBtc.maxPaymentSize)
      expect(worker._placeOrder.secondCall).to.have.been.calledWith(blockOrder, '10')
    })

    it('creates multiple orders if the counter size is above the max', () => {
      blockOrder.quantumPrice = '100'
      const maxAmount = Big(engineLtc.maxPaymentSize).div(100).round(0).toString()

      worker._placeOrders(blockOrder, Big(engineBtc.maxPaymentSize).minus(10).toString())

      expect(worker._placeOrder).to.have.been.calledTwice()
      expect(worker._placeOrder.firstCall).to.have.been.calledWith(blockOrder, maxAmount)
      expect(worker._placeOrder.secondCall).to.have.been.calledWith(blockOrder, '1677712')
    })
  })

  describe('#_placeOrder', () => {
    let worker
    let blockOrder
    let order

    beforeEach(() => {
      worker = new BlockOrderWorker({ orderbooks, store, logger, relayer, engines })
      worker.applyOsmListeners = sinon.stub()

      blockOrder = {
        id: 'fakeId',
        marketName: 'BTC/LTC',
        baseSymbol: 'BTC',
        counterSymbol: 'LTC',
        side: 'BID',
        amount: Big('0.000000100'),
        baseAmount: '100',
        counterAmount: '100000',
        quantumPrice: '1000',
        price: Big('1000'),
        timeInForce: 'GTC'
      }
      order = {
        id: 'anotherId',
        order: {
          orderId: 'orderid'
        }
      }
      OrderStateMachine.create.resolves(order)
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
      await worker._placeOrder(blockOrder, '50')

      expect(OrderStateMachine.create).to.have.been.calledWith(sinon.match.any, sinon.match.any, sinon.match({ counterAmount: '50000' }))
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

    it('applies listeners to the OrderStateMachine', async () => {
      await worker._placeOrder(blockOrder, '100')

      expect(worker.applyOsmListeners).to.have.been.calledOnce()
      expect(worker.applyOsmListeners).to.have.been.calledWith(order, blockOrder)
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

  describe('getTrades', () => {
    let worker
    let getRecords
    let ordersStore
    let fillsStore
    let completedOrder
    let executingOrder
    let rejectedOrder
    let filledFill
    let executedFill
    let rejectedFill

    beforeEach(() => {
      ordersStore = {
        put: sinon.stub()
      }
      fillsStore = {
        put: sinon.stub()
      }

      completedOrder = {
        orderId: 'orderId',
        state: 'completed'
      }
      executingOrder = {
        orderId: 'orderId2',
        state: 'executing'
      }
      rejectedOrder = {
        orderId: 'orderId3',
        state: 'rejected'
      }

      filledFill = {
        fillId: 'fillId',
        state: 'filled'
      }
      executedFill = {
        fillId: 'fillId2',
        state: 'executed'
      }
      rejectedFill = {
        fillId: 'fillId3',
        state: 'rejected'
      }

      getRecords = sinon.stub()
      getRecords.withArgs(
        ordersStore,
        sinon.match.func
      ).resolves([
        completedOrder,
        executingOrder,
        rejectedOrder
      ])
      getRecords.withArgs(
        fillsStore,
        sinon.match.func
      ).resolves([
        filledFill,
        executedFill,
        rejectedFill
      ])

      BlockOrderWorker.__set__('getRecords', getRecords)

      worker = new BlockOrderWorker({ orderbooks, store, logger, relayer, engines })
      worker.ordersStore = ordersStore
      worker.fillsStore = fillsStore
      OrderStateMachine.serialize = sinon.stub().returnsArg(0)
      FillStateMachine.serialize = sinon.stub().returnsArg(0)
    })

    it('retrieves all orders and fills from the store', async () => {
      await worker.getTrades()

      expect(getRecords).to.have.been.calledTwice()
      expect(getRecords).to.have.been.calledWith(
        ordersStore,
        sinon.match.func
      )
      expect(getRecords).to.have.been.calledWith(
        fillsStore,
        sinon.match.func
      )
    })

    it('returns filtered orders and fills', async () => {
      const res = await worker.getTrades()

      expect(res).to.eql({
        orders: [
          completedOrder,
          executingOrder
        ],
        fills: [
          filledFill,
          executedFill
        ]
      })
    })

    it('serializes the filtered orders', async () => {
      await worker.getTrades()

      expect(OrderStateMachine.serialize).to.have.been.calledWith(completedOrder)
      expect(OrderStateMachine.serialize).to.have.been.calledWith(executingOrder)
      expect(OrderStateMachine.serialize).to.not.have.been.calledWith(rejectedOrder)
    })

    it('serializes the filtered fills', async () => {
      await worker.getTrades()

      expect(FillStateMachine.serialize).to.have.been.calledWith(filledFill)
      expect(FillStateMachine.serialize).to.have.been.calledWith(executedFill)
      expect(FillStateMachine.serialize).to.not.have.been.calledWith(rejectedFill)
    })
  })
})
