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
      info: sinon.stub()
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

      expect(baseStore.sublevel).to.have.been.calledTwice()
      expect(baseStore.sublevel).to.have.been.calledWith('events')
      expect(orderbook).to.have.property('eventStore')
      expect(orderbook.eventStore).to.be.equal(eventStore)
    })

    it('creates an orderbook store', () => {
      const marketName = 'XYZ/ABC'
      const orderbook = new Orderbook(marketName, relayer, baseStore, logger)

      expect(baseStore.sublevel).to.have.been.calledTwice()
      expect(baseStore.sublevel).to.have.been.calledWith('orderbook')
      expect(orderbook).to.have.property('store')
      expect(orderbook.store).to.be.equal(orderbookStore)
    })

    it('monitors the event store', () => {
      const marketName = 'XYZ/ABC'
      const orderbook = new Orderbook(marketName, relayer, baseStore, logger)

      expect(orderbook).to.have.property('store')
      expect(eventStore.pre).to.have.been.calledOnce()
      expect(eventStore.pre).to.have.been.calledWithMatch(sinon.match.func)
    })

    it('ignores non-put operations on the event store', () => {
      const marketName = 'XYZ/ABC'
      const orderbook = new Orderbook(marketName, relayer, baseStore, logger)

      expect(orderbook).to.have.property('store')
      expect(eventStore.pre).to.have.been.calledOnce()
      expect(eventStore.pre).to.have.been.calledWithMatch(sinon.match.func)

      const preHook = eventStore.pre.args[0][0]
      const add = sinon.stub()

      const eventKey = 'yourkey'

      preHook(
        {
          type: 'del',
          key: eventKey
        },
        add
      )

      expect(add).to.not.have.been.called()
    })

    it('creates orders when events with PLACED status are added to the store', () => {
      const marketName = 'XYZ/ABC'
      const orderbook = new Orderbook(marketName, relayer, baseStore, logger)

      expect(orderbook).to.have.property('store')
      expect(eventStore.pre).to.have.been.calledOnce()
      expect(eventStore.pre).to.have.been.calledWithMatch(sinon.match.func)

      const preHook = eventStore.pre.args[0][0]
      const add = sinon.stub()

      const orderKey = 'mykey'
      const orderValue = 'myvalue'
      const event = {
        eventType: EventTypes.PLACED
      }

      EventFromStorage.returns(event)
      MarketEventOrderFromEvent.returns({
        key: orderKey,
        value: orderValue
      })

      const eventKey = 'yourkey'
      const eventValue = 'yourvalue'

      preHook(
        {
          type: 'put',
          key: eventKey,
          value: eventValue
        },
        add
      )

      expect(add).to.have.been.calledOnce()
      expect(add).to.have.been.calledWithMatch(sinon.match({
        key: orderKey,
        value: orderValue,
        type: 'put',
        prefix: orderbookStore
      }))
    })

    it('removes orders when events with CANCELLED status are added to the store', () => {
      const marketName = 'XYZ/ABC'
      const orderbook = new Orderbook(marketName, relayer, baseStore, logger)

      expect(orderbook).to.have.property('store')
      expect(eventStore.pre).to.have.been.calledOnce()
      expect(eventStore.pre).to.have.been.calledWithMatch(sinon.match.func)

      const preHook = eventStore.pre.args[0][0]
      const add = sinon.stub()

      const orderKey = 'mykey'
      const orderValue = 'myvalue'
      const event = {
        eventType: EventTypes.CANCELLED
      }

      EventFromStorage.returns(event)
      MarketEventOrderFromEvent.returns({
        key: orderKey,
        value: orderValue
      })

      const eventKey = 'yourkey'
      const eventValue = 'yourvalue'

      preHook(
        {
          type: 'put',
          key: eventKey,
          value: eventValue
        },
        add
      )

      expect(add).to.have.been.calledOnce()
      expect(add).to.have.been.calledWithMatch(sinon.match({
        key: orderKey,
        type: 'del',
        prefix: orderbookStore
      }))
    })

    it('removes orders when events with FILLED status are added to the store', () => {
      const marketName = 'XYZ/ABC'
      const orderbook = new Orderbook(marketName, relayer, baseStore, logger)

      expect(orderbook).to.have.property('store')
      expect(eventStore.pre).to.have.been.calledOnce()
      expect(eventStore.pre).to.have.been.calledWithMatch(sinon.match.func)

      const preHook = eventStore.pre.args[0][0]
      const add = sinon.stub()

      const orderKey = 'mykey'
      const orderValue = 'myvalue'
      const event = {
        eventType: EventTypes.FILLED
      }

      EventFromStorage.returns(event)
      MarketEventOrderFromEvent.returns({
        key: orderKey,
        value: orderValue
      })

      const eventKey = 'yourkey'
      const eventValue = 'yourvalue'

      preHook(
        {
          type: 'put',
          key: eventKey,
          value: eventValue
        },
        add
      )

      expect(add).to.have.been.calledOnce()
      expect(add).to.have.been.calledWithMatch(sinon.match({
        key: orderKey,
        type: 'del',
        prefix: orderbookStore
      }))
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
    it('gets the timestamp of the last event', async () => {
      const marketName = 'XYZ/ABC'
      const orderbook = new Orderbook(marketName, relayer, baseStore, logger)
      const bound = 'mybind'
      EventFromStorageBind.returns(bound)

      const lastEvent = {
        timestamp: '123124234'
      }
      getRecords.resolves([ lastEvent ])

      const timestamp = await orderbook.lastUpdate()

      expect(getRecords).to.have.been.calledOnce()
      expect(getRecords).to.have.been.calledWith(eventStore, bound, sinon.match({ reverse: true, limit: 1 }))
      expect(timestamp).to.be.equal(lastEvent.timestamp)
    })

    it('returns null if there are no events', async () => {
      const marketName = 'XYZ/ABC'
      const orderbook = new Orderbook(marketName, relayer, baseStore, logger)

      getRecords.resolves([])

      const timestamp = await orderbook.lastUpdate()

      expect(timestamp).to.be.null()
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
