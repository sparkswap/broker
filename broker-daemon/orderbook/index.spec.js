const path = require('path')
const { rewire, sinon, expect } = require('test/test-helper')
const { Big } = require('../utils')

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
  let rangeFromTimestampStub
  let rangeFromTimestamp

  beforeEach(() => {
    EventFromStorageBind = sinon.stub()
    EventFromStorage = sinon.stub()
    EventFromStorage.bind = EventFromStorageBind
    rangeFromTimestamp = sinon.stub()
    rangeFromTimestampStub = sinon.stub().returns(rangeFromTimestamp)

    Orderbook.__set__('MarketEvent', {
      fromStorage: EventFromStorage,
      TYPES: EventTypes,
      rangeFromTimestamp: rangeFromTimestampStub
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
      debug: sinon.stub(),
      error: sinon.stub()
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

    it('defaults synced status to false', () => {
      const marketName = 'XYZ/ABC'
      const orderbook = new Orderbook(marketName, relayer, baseStore)

      expect(orderbook.synced).to.be.false()
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

    it('creates an ask index', () => {
      const marketName = 'XYZ/ABC'
      const orderbook = new Orderbook(marketName, relayer, baseStore, logger)

      expect(AskIndex).to.have.been.calledOnce()
      expect(AskIndex).to.have.been.calledWithNew()
      expect(AskIndex).to.have.been.calledWith(orderbookStore)
      expect(orderbook.askIndex).to.be.an.instanceOf(AskIndex)
    })

    it('creates a bid index', () => {
      const marketName = 'XYZ/ABC'
      const orderbook = new Orderbook(marketName, relayer, baseStore, logger)

      expect(BidIndex).to.have.been.calledOnce()
      expect(BidIndex).to.have.been.calledWithNew()
      expect(BidIndex).to.have.been.calledWith(orderbookStore)
      expect(orderbook.bidIndex).to.be.an.instanceOf(BidIndex)
    })
  })

  describe('#initialize', () => {
    let baseSymbol
    let counterSymbol
    let marketName
    let orderbook

    beforeEach(async () => {
      baseSymbol = 'XYZ'
      counterSymbol = 'ABAC'
      marketName = `${baseSymbol}/${counterSymbol}`
      orderbook = new Orderbook(marketName, relayer, baseStore, logger)

      orderbook.watchMarket = sinon.stub().resolves()
      orderbook.index = {
        ensureIndex: sinon.stub().resolves()
      }
      orderbook.bidIndex = {
        ensureIndex: sinon.stub().resolves()
      }
      orderbook.askIndex = {
        ensureIndex: sinon.stub().resolves()
      }

      await orderbook.initialize()
    })

    it('sets the synced status to false', () => {
      expect(orderbook.synced).to.be.false()
    })

    it('sets up the orderbook index', () => {
      expect(orderbook.index.ensureIndex).to.have.been.calledOnce()
    })

    it('sets up the ask index', () => {
      expect(orderbook.askIndex.ensureIndex).to.have.been.calledOnce()
    })

    it('sets up the bid index', () => {
      expect(orderbook.bidIndex.ensureIndex).to.have.been.calledOnce()
    })

    it('watches the market on initialization', () => {
      expect(orderbook.watchMarket).to.have.been.calledOnce()
    })
  })

  describe('#watchMarket', () => {
    let baseSymbol
    let counterSymbol
    let marketName
    let orderbook
    let lastUpdated
    let sequence
    let watcher

    beforeEach(async () => {
      baseSymbol = 'XYZ'
      counterSymbol = 'ABAC'
      marketName = `${baseSymbol}/${counterSymbol}`
      orderbook = new Orderbook(marketName, relayer, baseStore, logger)

      lastUpdated = '1232142343'
      sequence = '1'

      orderbook.lastUpdate = sinon.stub()
      orderbook.lastUpdate.resolves({
        lastUpdated,
        sequence
      })

      watcher = {
        once: sinon.stub(),
        migrate: sinon.stub(),
        removeListener: sinon.stub()
      }

      relayer.watchMarket.returns(watcher)

      await orderbook.watchMarket()
    })

    it('watches the market on initialization', () => {
      expect(relayer.watchMarket).to.have.been.calledOnce()
      expect(relayer.watchMarket).to.have.been.calledWith(eventStore, sinon.match({ baseSymbol, counterSymbol, lastUpdated, sequence }))
    })

    it('sets a sync listener', () => {
      expect(watcher.once).to.have.been.calledWith('sync', sinon.match.func)
    })

    it('sets an end listener', () => {
      expect(watcher.once).to.have.been.calledWith('end', sinon.match.func)
    })

    it('sets an error listener', () => {
      expect(watcher.once).to.have.been.calledWith('error', sinon.match.func)
    })

    describe('watcher syncs', () => {
      beforeEach(() => {
        const onSync = watcher.once.withArgs('sync').args[0][1]

        onSync()
      })

      it('sets the synced status to true', () => {
        expect(orderbook.synced).to.be.true()
      })
    })

    describe('watcher ends', () => {
      let timeoutStub
      let onEnd

      beforeEach(() => {
        orderbook.watchMarket = sinon.stub()
        timeoutStub = sinon.stub()

        Orderbook.__set__('setTimeout', timeoutStub)

        onEnd = watcher.once.withArgs('end').args[0][1]

        onEnd()
      })

      it('sets the synced status to false', () => {
        expect(orderbook.synced).to.be.false()
      })

      it('removes the sync listener', () => {
        expect(watcher.removeListener).to.have.been.calledWith('sync', sinon.match.func)
      })

      it('removes the error listener', () => {
        expect(watcher.removeListener).to.have.been.calledWith('error', sinon.match.func)
      })

      it('exponentially backs off after repeated end events', () => {
        expect(timeoutStub).to.have.been.calledOnce()
        expect(timeoutStub).to.have.been.calledWith(sinon.match.func, 1000)

        const expectedResults = [3000, 7000, 15000, 31000]

        for (let i = 0; i < expectedResults.length; i++) {
          onEnd()
          const expected = expectedResults[i]
          expect(timeoutStub.lastCall).to.have.been.calledWith(sinon.match.func, expected)
        }

        // Test the MAX_RETRY_INTERVAL is reached and maintained
        for (let i = 0; i < 2; i++) {
          onEnd()
          const expected = 60000
          expect(timeoutStub.lastCall).to.have.been.calledWith(sinon.match.func, expected)
        }
      })

      it('re-initializes after the timeout', () => {
        const timeoutFunc = timeoutStub.args[0][0]

        timeoutFunc()

        expect(orderbook.watchMarket).to.have.been.calledOnce()
        expect(orderbook.watchMarket).to.have.been.calledWith(1)
      })
    })

    describe('watcher ends then re-syncs', () => {
      let onSync
      let onEnd
      let timeoutStub
      let watchMarketStub
      let retries

      beforeEach(() => {
        onSync = watcher.once.withArgs('sync').args[0][1]
        onEnd = watcher.once.withArgs('end').args[0][1]
        timeoutStub = sinon.stub()

        Orderbook.__set__('setTimeout', timeoutStub)
      })

      it('resets retries to 0 after syncing', () => {
        // Emit end event, make sure retries is 1
        onEnd()

        watchMarketStub = sinon.stub(orderbook, 'watchMarket')
        const timeoutFunc = timeoutStub.args[0][0]
        timeoutFunc()

        retries = watchMarketStub.lastCall.args[0]
        expect(retries).to.be.eql(1)

        // Call watchMarket with updated retries
        watchMarketStub.restore()
        timeoutFunc()

        // Emit another end event, make sure retries is 2
        onEnd()
        watchMarketStub = sinon.stub(orderbook, 'watchMarket')
        timeoutFunc()

        retries = watchMarketStub.lastCall.args[0]
        expect(retries).to.be.eql(2)

        // Call watchMarket with updated retries
        watchMarketStub.restore()
        timeoutFunc()

        // Sync orderbook, then emit another end event making sure retries were reset on sync
        onSync()
        onEnd()

        watchMarketStub = sinon.stub(orderbook, 'watchMarket')
        timeoutFunc()

        retries = watchMarketStub.lastCall.args[0]
        expect(retries).to.be.eql(1)
      })
    })

    describe('watcher errors', () => {
      let onError

      beforeEach(() => {
        orderbook.watchMarket = sinon.stub()
        onError = watcher.once.withArgs('error').args[0][1]
      })

      it('sets the synced status to false', () => {
        onError()

        expect(orderbook.synced).to.be.false()
      })

      it('removes the sync listener', () => {
        onError()

        expect(watcher.removeListener).to.have.been.calledWith('sync', sinon.match.func)
      })

      it('removes the end listener', () => {
        onError()

        expect(watcher.removeListener).to.have.been.calledWith('end', sinon.match.func)
      })

      it('migrates the watcher', () => {
        onError()

        expect(watcher.migrate).to.have.been.calledOnce()
      })

      it('resets the orderbook index', async () => {
        watcher.migrate.resolves()
        await onError()

        const ensureIndex = OrderbookIndex.prototype.ensureIndex

        expect(ensureIndex).to.have.been.calledOnce()
        expect(ensureIndex).to.have.been.calledOn(orderbook.index)
      })

      it('retries watching the market', async () => {
        watcher.migrate.resolves()
        await onError()

        expect(orderbook.watchMarket).to.have.been.calledOnce()
      })

      it('waits for migration to be complete before re-watching the market', () => {
        let migrateResolve
        const fakePromise = new Promise((resolve) => {
          migrateResolve = resolve
        })
        watcher.migrate.returns(fakePromise)

        onError()

        setImmediate(() => {
          expect(orderbook.watchMarket).to.not.have.been.called()

          migrateResolve()

          setImmediate(() => {
            expect(orderbook.watchMarket).to.have.been.calledOnce()
          })
        })
      })
    })
  })

  describe('#assertSynced', () => {
    let orderbook

    beforeEach(() => {
      const marketName = 'XYZ/ABC'

      orderbook = new Orderbook(marketName, relayer, baseStore, logger)
    })

    it('throws if the orderbook is not synced', () => {
      orderbook.synced = false

      expect(() => orderbook.assertSynced()).to.throw()
    })

    it('does not throw if the orderbook is synced', () => {
      orderbook.synced = true

      expect(() => orderbook.assertSynced()).not.to.throw()
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
    let orderbook
    let bound
    let orders
    let retrieved

    beforeEach(async () => {
      const marketName = 'XYZ/ABC'
      orderbook = new Orderbook(marketName, relayer, baseStore, logger)

      orderbook.assertSynced = sinon.stub()

      bound = 'mybind'
      MarketEventOrderFromStorageBind.returns(bound)

      orders = []
      getRecords.resolves(orders)

      retrieved = await orderbook.all()
    })

    it('makes sure the orderbook is synced', () => {
      expect(orderbook.assertSynced).to.have.been.calledOnce()
    })

    it('returns all the orders', () => {
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
      orderbook.assertSynced = sinon.stub()
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

    it('makes sure the orderbook is synced', () => {
      orderbook.getBestOrders({ side: 'ASK', depth: '100' })

      expect(orderbook.assertSynced).to.have.been.calledOnce()
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

  describe('getAveragePrice', () => {
    let side
    let targetDepth
    let orders
    let orderbook

    beforeEach(() => {
      side = 'BID'
      targetDepth = 10
      orders = [
        {
          baseAmount: 1,
          price: 10
        },
        {
          baseAmount: 2,
          price: 3
        }
      ]
      orderbook = new Orderbook('BTC/LTC', relayer, baseStore, logger)
      orderbook.getBestOrders = sinon.stub().resolves({orders, depth: targetDepth})
    })

    it('gets the best orders given the side and depth', async () => {
      await orderbook.getAveragePrice(side, targetDepth)
      expect(orderbook.getBestOrders).to.have.been.called()
      expect(orderbook.getBestOrders).to.have.been.calledWith({side, depth: targetDepth})
    })

    it('throws an error if there is not sufficient depth in the orderbook', () => {
      orderbook.getBestOrders.resolves({orders, depth: 8})
      return expect(orderbook.getAveragePrice(side, targetDepth)).to.eventually.be.rejectedWith('Insufficient depth to find averagePrice')
    })

    it('returns the average weighted price', async () => {
      const res = await orderbook.getAveragePrice(side, targetDepth)
      expect(res).to.eql(Big(1.6))
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

  describe('getTrades', () => {
    let orderbook
    let marketName
    let timestamp
    let limit
    let revert
    let getRecordsStub
    let bound

    beforeEach(() => {
      marketName = 'BTC/LTC'
      timestamp = '2018-09-21T10:40:31.0342339Z'
      limit = 5
      getRecordsStub = sinon.stub()
      orderbook = new Orderbook(marketName, relayer, baseStore, logger)
      orderbook.assertSynced = sinon.stub()
      bound = 'mybind'
      EventFromStorageBind.returns(bound)
      revert = Orderbook.__set__('getRecords', getRecordsStub)
    })

    afterEach(() => {
      revert()
    })

    it('makes sure the orderbook is synced', async () => {
      await orderbook.getTrades(timestamp, limit)
      expect(orderbook.assertSynced).to.have.been.calledOnce()
    })

    it('does not add a lowerbound if no since date is provided', async () => {
      timestamp = undefined
      await orderbook.getTrades(timestamp, limit)
      expect(getRecordsStub).to.have.been.calledWith(
        eventStore,
        bound,
        {limit}
      )
    })

    it('calls get records with a timestamp', async () => {
      await orderbook.getTrades(timestamp, limit)
      expect(getRecordsStub).to.have.been.calledWith(
        eventStore,
        bound,
        {gte: '1537526431034000000', limit}
      )
    })
  })

  describe('getOrderbookEventsByTimestamp', () => {
    let orderbook
    let marketName
    let timestamp
    let revert
    let getRecordsStub

    beforeEach(() => {
      marketName = 'BTC/LTC'
      timestamp = 'fake nano timestamp'
      getRecordsStub = sinon.stub()
      orderbook = new Orderbook(marketName, relayer, baseStore, logger)
      orderbook.assertSynced = sinon.stub()
      revert = Orderbook.__set__('getRecords', getRecordsStub)
    })

    beforeEach(async () => {
      await orderbook.getOrderbookEventsByTimestamp(timestamp)
    })

    afterEach(() => {
      revert()
    })

    it('makes sure the orderbook is synced', () => {
      expect(orderbook.assertSynced).to.have.been.calledOnce()
    })

    it('calls get records with a timestamp', () => {
      expect(getRecordsStub).to.have.been.calledWith(
        orderbookStore,
        sinon.match.func,
        rangeFromTimestamp
      )
      expect(rangeFromTimestampStub).to.have.been.calledWith(timestamp)
    })
  })

  describe('getMarketEventsByTimestamp', () => {
    let orderbook
    let marketName
    let timestamp
    let revert
    let getRecordsStub

    beforeEach(() => {
      marketName = 'BTC/LTC'
      timestamp = 'fake nano timestamp'
      getRecordsStub = sinon.stub()
      orderbook = new Orderbook(marketName, relayer, baseStore, logger)
      orderbook.assertSynced = sinon.stub()

      revert = Orderbook.__set__('getRecords', getRecordsStub)
    })

    beforeEach(async () => {
      await orderbook.getMarketEventsByTimestamp(timestamp)
    })

    afterEach(() => {
      revert()
    })

    it('makes sure the orderbook is synced', () => {
      expect(orderbook.assertSynced).to.have.been.calledOnce()
    })

    it('calls get records with a timestamp', () => {
      expect(getRecordsStub).to.have.been.calledWith(
        eventStore,
        sinon.match.func,
        rangeFromTimestamp
      )
      expect(rangeFromTimestampStub).to.have.been.calledWith(timestamp)
    })
  })
})
