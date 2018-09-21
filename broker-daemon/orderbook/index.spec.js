const path = require('path')
const { rewire, sinon, expect } = require('test/test-helper')

const Orderbook = rewire(path.resolve('broker-daemon', 'orderbook', 'index'))

describe('Orderbook', () => {
  let EventFromStorage
  let EventFromStorageBind
  let EventTypes = {
    PLACED: 'PLACED',
    CANCELLED: 'CANCELLED',
    FILLED: 'FILLED'
  }
  let MarketEventOrderFromStorage
  let MarketEventOrderFromStorageBind
  let MarketEventOrderFromEvent
  let getRecords
  let AskIndex
  let BidIndex
  let baseStore
  let orderbookStore
  let eventStore
  let relayer
  let logger
  let OrderbookIndex

  beforeEach(() => {
    EventFromStorageBind = sinon.stub()
    EventFromStorage = sinon.stub()
    EventFromStorage.bind = EventFromStorageBind
    Orderbook.__set__('MarketEvent', {
      fromStorage: EventFromStorage,
      TYPES: EventTypes
    })

    MarketEventOrderFromStorageBind = sinon.stub()
    MarketEventOrderFromStorage = sinon.stub()
    MarketEventOrderFromStorage.bind = MarketEventOrderFromStorageBind
    MarketEventOrderFromEvent = sinon.stub()
    Orderbook.__set__('MarketEventOrder', {
      SIDES: {
        BID: 'BID',
        ASK: 'ASK'
      },
      fromStorage: MarketEventOrderFromStorage,
      fromEvent: MarketEventOrderFromEvent
    })

    AskIndex = sinon.stub()
    AskIndex.prototype.ensureIndex = sinon.stub().resolves()
    Orderbook.__set__('AskIndex', AskIndex)

    BidIndex = sinon.stub()
    BidIndex.prototype.ensureIndex = sinon.stub().resolves()
    Orderbook.__set__('BidIndex', BidIndex)

    getRecords = sinon.stub()
    Orderbook.__set__('getRecords', getRecords)

    orderbookStore = {
      sublevel: sinon.stub().returns({
        pre: sinon.stub(),
        batch: sinon.stub(),
        createReadStream: sinon.stub().returns({
          on: sinon.stub()
        })
      }),
      createReadStream: sinon.stub().returns({
        on: sinon.stub()
      }),
      pre: sinon.stub()
    }

    OrderbookIndex = sinon.stub()
    OrderbookIndex.prototype.ensureIndex = sinon.stub().resolves()
    OrderbookIndex.prototype.store = orderbookStore
    Orderbook.__set__('OrderbookIndex', OrderbookIndex)

    eventStore = {
      pre: sinon.stub()
    }
    const baseStoreSublevel = sinon.stub()
    baseStoreSublevel.withArgs('orderbook').returns(orderbookStore)
    baseStoreSublevel.withArgs('events').returns(eventStore)

    baseStore = {
      pre: sinon.stub(),
      sublevel: baseStoreSublevel
    }

    relayer = {
      watchMarket: sinon.stub()
    }

    logger = {
      info: sinon.stub(),
      debug: sinon.stub()
    }
  })

  describe('new', () => {
    it('creates a new orderbook', () => {
      const marketName = 'XYZ/ABC'
      const orderbook = new Orderbook(marketName, relayer, baseStore, logger)

      expect(orderbook).to.have.property('marketName')
      expect(orderbook.marketName).to.be.eql(marketName)
      expect(orderbook).to.have.property('relayer')
      expect(orderbook.relayer).to.be.equal(relayer)
      expect(orderbook).to.have.property('logger')
      expect(orderbook.logger).to.be.equal(logger)
    })

    it('defaults the logger to the console', () => {
      const marketName = 'XYZ/ABC'
      const orderbook = new Orderbook(marketName, relayer, baseStore)

      expect(orderbook.logger).to.be.equal(console)
    })

    it('creates an event store', () => {
      const marketName = 'XYZ/ABC'
      const orderbook = new Orderbook(marketName, relayer, baseStore, logger)

      expect(baseStore.sublevel).to.have.been.calledOnce()
      expect(baseStore.sublevel).to.have.been.calledWith('events')
      expect(orderbook).to.have.property('eventStore')
      expect(orderbook.eventStore).to.be.equal(eventStore)
    })

    it('creates an orderbook index and store', () => {
      const marketName = 'XYZ/ABC'
      const orderbook = new Orderbook(marketName, relayer, baseStore, logger)

      expect(OrderbookIndex).to.have.been.calledOnce()
      expect(OrderbookIndex).to.have.been.calledWithNew()
      expect(OrderbookIndex).to.have.been.calledWith(baseStore, eventStore, marketName)
      expect(orderbook.index).to.be.an.instanceOf(OrderbookIndex)
      expect(orderbook.store).to.be.eql(orderbookStore)
    })
  })

  describe('#initialize', () => {
    let baseSymbol
    let counterSymbol
    let marketName
    let orderbook
    let lastUpdated
    let lastEvent

    beforeEach(async () => {
      baseSymbol = 'XYZ'
      counterSymbol = 'ABAC'
      marketName = `${baseSymbol}/${counterSymbol}`
      orderbook = new Orderbook(marketName, relayer, baseStore, logger)

      lastUpdated = '1232142343'
      lastEvent = {
        timestamp: lastUpdated
      }

      getRecords.resolves([ lastEvent ])
      relayer.watchMarket.resolves()

      await orderbook.initialize()
    })

    it('watches the market on initialization', async () => {
      expect(relayer.watchMarket).to.have.been.calledOnce()
      expect(relayer.watchMarket).to.have.been.calledWith(eventStore, sinon.match({ baseSymbol, counterSymbol, lastUpdated }))
    })

    it('sets up the orderbook index', () => {
      expect(OrderbookIndex.prototype.ensureIndex).to.have.been.calledOnce()
    })

    it('sets up an ask index', () => {
      expect(AskIndex).to.have.been.calledOnce()
      expect(AskIndex).to.have.been.calledWithNew()
      expect(AskIndex).to.have.been.calledWith(orderbookStore)
      expect(AskIndex.prototype.ensureIndex).to.have.been.calledOnce()
    })

    it('sets up a bid index', () => {
      expect(BidIndex).to.have.been.calledOnce()
      expect(BidIndex).to.have.been.calledWithNew()
      expect(BidIndex).to.have.been.calledWith(orderbookStore)
      expect(BidIndex.prototype.ensureIndex).to.have.been.calledOnce()
    })
  })

  describe('#lastUpdate', () => {
    let orderbook
    let getLastRecordStub
    let timestamp
    let sequence

    beforeEach(() => {
      const marketName = 'XYZ/ABC'
      timestamp = '1234'
      sequence = '0'

      getLastRecordStub = sinon.stub().returns({
        timestamp,
        sequence
      })

      orderbook = new Orderbook(marketName, relayer, baseStore, logger)
      orderbook.getLastRecord = getLastRecordStub
    })

    it('grabs the last record from the orderbook', async () => {
      await orderbook.lastUpdate()
      expect(getLastRecordStub)
    })

    it('returns lastUpdated timestamp', async () => {
      const result = await orderbook.lastUpdate()
      expect(result).to.have.property('lastUpdated', timestamp)
    })

    it('returns a sequence number', async () => {
      const result = await orderbook.lastUpdate()
      expect(result).to.have.property('sequence', sequence)
    })
  })

  describe('#getLastRecord', () => {
    it('gets the timestamp of the last event', async () => {
      const marketName = 'XYZ/ABC'
      const orderbook = new Orderbook(marketName, relayer, baseStore, logger)
      const bound = 'mybind'
      EventFromStorageBind.returns(bound)

      const lastEvent = {
        timestamp: '123124234'
      }
      getRecords.resolves([ lastEvent ])

      const event = await orderbook.getLastRecord()

      expect(getRecords).to.have.been.calledOnce()
      expect(getRecords).to.have.been.calledWith(eventStore, bound, sinon.match({ reverse: true, limit: 1 }))
      expect(event).to.be.eql(lastEvent)
    })

    it('returns an empty object if there are no events', async () => {
      const marketName = 'XYZ/ABC'
      const orderbook = new Orderbook(marketName, relayer, baseStore, logger)

      getRecords.resolves([])

      const event = await orderbook.getLastRecord()

      expect(event).to.be.eql({})
    })
  })

  describe('#all', () => {
    it('returns all the orders', async () => {
      const marketName = 'XYZ/ABC'
      const orderbook = new Orderbook(marketName, relayer, baseStore, logger)
      const bound = 'mybind'
      MarketEventOrderFromStorageBind.returns(bound)

      const orders = []
      getRecords.resolves(orders)

      const retrieved = await orderbook.all()

      expect(getRecords).to.have.been.calledOnce()
      expect(getRecords).to.have.been.calledWith(orderbookStore, bound)
      expect(retrieved).to.be.equal(orders)
    })
  })

  describe('#getBestOrders', () => {
    let orderbook
    let askIndex
    let bidIndex
    let stream
    let orders

    beforeEach(() => {
      orderbook = new Orderbook('XYZ/ABC', relayer, baseStore, logger)
      stream = {
        on: sinon.stub(),
        unpipe: sinon.stub(),
        pause: sinon.stub()
      }
      askIndex = {
        streamOrdersAtPriceOrBetter: sinon.stub().returns(stream)
      }
      bidIndex = {
        streamOrdersAtPriceOrBetter: sinon.stub().returns(stream)
      }

      orderbook.askIndex = askIndex
      orderbook.bidIndex = bidIndex

      orders = [
        {
          key: 'a',
          value: {
            baseAmount: '90'
          }
        },
        {
          key: 'b',
          value: {
            baseAmount: '100'
          }
        },
        {
          key: 'c',
          value: {
            baseAmount: '50'
          }
        }
      ]

      MarketEventOrderFromStorage.withArgs(orders[0].key, orders[0].value).returns(orders[0].value)
      MarketEventOrderFromStorage.withArgs(orders[1].key, orders[1].value).returns(orders[1].value)
      MarketEventOrderFromStorage.withArgs(orders[2].key, orders[2].value).returns(orders[2].value)

      stream.on.withArgs('data').callsFake((evt, fn) => {
        const locals = orders.slice()
        function nextOrder () {
          fn(locals.shift())

          if (locals.length) {
            process.nextTick(nextOrder)
          }
        }

        process.nextTick(nextOrder)
      })
    })

    it('rejects if using an invalid side', () => {
      return expect(orderbook.getBestOrders({ side: 'UGH', depth: '100' })).to.eventually.be.rejectedWith(Error)
    })

    it('pulls a read stream from the correct side', () => {
      orderbook.getBestOrders({ side: 'ASK', depth: '100' })

      expect(askIndex.streamOrdersAtPriceOrBetter).to.have.been.calledOnce()
    })

    it('rejects on stream error', () => {
      stream.on.withArgs('error').callsArgWithAsync(1, new Error('fake error'))

      return expect(orderbook.getBestOrders({ side: 'ASK', depth: '100' })).to.eventually.be.rejectedWith('fake error')
    })

    it('returns the current orders if the stream ends early', async () => {
      stream.on.withArgs('end').callsArgAsync(1)

      const { orders, depth } = await orderbook.getBestOrders({ side: 'ASK', depth: '100' })

      expect(orders).to.be.an('array')
      expect(orders).to.have.lengthOf(0)
      expect(depth).to.be.equal('0')
    })

    it('only collects enough depth to satisfy the request', async () => {
      const { orders } = await orderbook.getBestOrders({ side: 'ASK', depth: '100' })

      expect(orders).to.have.lengthOf(2)
    })

    it('returns the collected depth', async () => {
      const { depth } = await orderbook.getBestOrders({ side: 'ASK', depth: '100' })

      expect(depth).to.be.equal('190')
    })

    it('returns inflated MarketEventOrders', async () => {
      const { orders: bestOrders } = await orderbook.getBestOrders({ side: 'ASK', depth: '100' })

      expect(MarketEventOrderFromStorage).to.have.been.calledTwice()
      expect(MarketEventOrderFromStorage).to.have.been.calledWith(orders[0].key, orders[0].value)
      expect(MarketEventOrderFromStorage).to.have.been.calledWith(orders[1].key, orders[1].value)
      expect(bestOrders[0]).to.be.equal(orders[0].value)
      expect(bestOrders[1]).to.be.equal(orders[1].value)
    })

    it('unpipes and pauses the stream once it is done', async () => {
      await orderbook.getBestOrders({ side: 'ASK', depth: '100' })

      expect(stream.unpipe).to.have.been.calledOnce()
      expect(stream.pause).to.have.been.calledOnce()
    })

    it('returns only orders better or equal to the given price', async () => {
      const quantumPrice = '100'

      await orderbook.getBestOrders({ side: 'ASK', depth: '100', quantumPrice })

      expect(askIndex.streamOrdersAtPriceOrBetter).to.have.been.calledWith('100')
    })

    it('returns all available orders when given no price', async () => {
      await orderbook.getBestOrders({ side: 'ASK', depth: '100' })

      expect(askIndex.streamOrdersAtPriceOrBetter).to.have.been.calledWith(undefined)
    })
  })

  describe('get baseSymbol', () => {
    it('returns the base symbol', async () => {
      const marketName = 'XYZ/ABC'
      const orderbook = new Orderbook(marketName, relayer, baseStore, logger)

      expect(orderbook.baseSymbol).to.be.equal('XYZ')
    })
  })

  describe('get counterSymbol', () => {
    it('returns the counter symbol', async () => {
      const marketName = 'XYZ/ABC'
      const orderbook = new Orderbook(marketName, relayer, baseStore, logger)

      expect(orderbook.counterSymbol).to.be.equal('ABC')
    })
  })
})
