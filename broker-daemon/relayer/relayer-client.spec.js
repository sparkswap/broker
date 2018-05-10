const path = require('path')
const { chai, sinon, rewire, delay } = require('test/test-helper')
const { expect } = chai

const RelayerClient = rewire(path.resolve('broker-daemon', 'relayer', 'relayer-client'))

describe('RelayerClient', () => {
  let grpcCredentialsInsecure
  let MarketEvent
  let loadProto
  let proto
  let Maker
  let OrderBook
  let ResponseTypes = {
    EXISTING_EVENT: 'EXISTING_EVENT',
    EXISTING_EVENTS_DONE: 'EXISTING_EVENTS_DONE',
    NEW_EVENT: 'NEW_EVENT'
  }

  beforeEach(() => {
    MarketEvent = sinon.stub()
    RelayerClient.__set__('MarketEvent', MarketEvent)

    Maker = sinon.stub()
    OrderBook = sinon.stub()
    proto = {
      Maker,
      OrderBook,
      WatchMarketResponse: {
        ResponseTypes
      }
    }
    loadProto = sinon.stub().returns(proto)
    RelayerClient.__set__('loadProto', loadProto)

    grpcCredentialsInsecure = sinon.stub()
    RelayerClient.__set__('grpc', {
      credentials: {
        createInsecure: grpcCredentialsInsecure
      }
    })
  })

  describe('new', () => {
    it('assigns a logger', () => {
      const logger = {}
      const relayer = new RelayerClient(logger)

      expect(relayer).to.have.property('logger')
      expect(relayer.logger).to.be.equal(logger)
    })

    it('defaults the logger to the console', () => {
      const relayer = new RelayerClient()

      expect(relayer).to.have.property('logger')
      expect(relayer.logger).to.be.equal(console)
    })

    it('loads the proto', () => {
      const relayer = new RelayerClient()

      expect(loadProto).to.have.been.calledOnce()
      expect(loadProto).to.have.been.calledWith('./proto/relayer.proto')
      expect(relayer).to.have.property('proto')
      expect(relayer.proto).to.be.equal(proto)
    })

    it('creates the Maker service', () => {
      const fakeCreds = 'mypass'
      grpcCredentialsInsecure.returns(fakeCreds)

      const relayer = new RelayerClient()

      expect(Maker).to.have.been.calledOnce()
      expect(Maker).to.have.been.calledWithNew()
      expect(Maker).to.have.been.calledWith('localhost:28492', fakeCreds)
      expect(relayer).to.have.property('maker')
      expect(relayer.maker).to.be.instanceOf(Maker)
    })

    it('creates the OrderBook service', () => {
      const fakeCreds = 'mypass'
      grpcCredentialsInsecure.returns(fakeCreds)

      const relayer = new RelayerClient()

      expect(OrderBook).to.have.been.calledOnce()
      expect(OrderBook).to.have.been.calledWithNew()
      expect(OrderBook).to.have.been.calledWith('localhost:28492', fakeCreds)
      expect(relayer).to.have.property('orderbook')
      expect(relayer.orderbook).to.be.instanceOf(OrderBook)
    })
  })

  describe.skip('createOrder', () => {

  })

  describe('watchMarket', () => {
    let relayer
    let store
    let params
    let watchMarket
    let stream

    beforeEach(() => {
      relayer = new RelayerClient()
      store = {
        put: sinon.stub()
      }
      params = {
        baseSymbol: 'XYZ',
        counterSymbol: 'CBAA',
        lastUpdated: null
      }

      stream = {
        on: sinon.stub()
      }

      watchMarket = sinon.stub().resolves(stream)

      OrderBook.prototype.watchMarket = watchMarket

      MarketEvent.prototype.key = 'key'
      MarketEvent.prototype.value = 'value'
    })

    it('returns a promise', () => {
      const watcher = relayer.watchMarket(store, params)

      expect(watcher).to.be.a('promise')
    })

    it('creates a watchMarket stream', () => {
      relayer.watchMarket(store, params)

      expect(watchMarket).to.have.been.calledOnce()
      expect(watchMarket).to.have.been.calledWith(params)
    })

    it('errors out when stream creation fails', () => {
      watchMarket.rejects()

      return expect(relayer.watchMarket(store, params)).to.be.rejectedWith(Error)
    })

    it('listens for events on the watchMarket stream', async () => {
      relayer.watchMarket(store, params)

      await delay(10)

      expect(stream.on).to.have.been.calledTwice()
      expect(stream.on).to.have.been.calledWith('data')
      expect(stream.on).to.have.been.calledWith('end')
    })

    // TODO: figure out how to test an async throw
    xit('throws if the relayer ends the stream', async () => {
    })

    it('resolves when existing events are done', async () => {
      const fakeDone = { type: ResponseTypes.EXISTING_EVENTS_DONE }
      stream.on.withArgs('data').callsFake(async (evt, fn) => {
        await delay(10)
        fn(fakeDone)
      })

      return relayer.watchMarket(store, params)
    })

    it('puts existing events into the store', async () => {
      const fakeResponse = { type: ResponseTypes.EXISTING_EVENT, marketEvent: 'fakeEvent' }
      const fakeDone = { type: ResponseTypes.EXISTING_EVENTS_DONE }
      stream.on.withArgs('data').callsFake(async (evt, fn) => {
        await delay(10)
        fn(fakeResponse)
        await delay(10)
        fn(fakeDone)
      })

      await relayer.watchMarket(store, params)

      expect(MarketEvent).to.have.been.calledOnce()
      expect(MarketEvent).to.have.been.calledWithNew()
      expect(MarketEvent).to.have.been.calledWith(fakeResponse.marketEvent)
      expect(store.put).to.have.been.calledOnce()
      expect(store.put).to.have.been.calledWith(MarketEvent.prototype.key, MarketEvent.prototype.value)
    })

    it('puts new events into the store', async () => {
      const fakeResponse = { type: ResponseTypes.EXISTING_EVENT, marketEvent: 'fakeEvent' }
      const fakeDone = { type: ResponseTypes.EXISTING_EVENTS_DONE }
      stream.on.withArgs('data').callsFake(async (evt, fn) => {
        await delay(10)
        fn(fakeResponse)
        await delay(10)
        fn(fakeDone)
      })

      await relayer.watchMarket(store, params)

      expect(MarketEvent).to.have.been.calledOnce()
      expect(MarketEvent).to.have.been.calledWithNew()
      expect(MarketEvent).to.have.been.calledWith(fakeResponse.marketEvent)
      expect(store.put).to.have.been.calledOnce()
      expect(store.put).to.have.been.calledWith(MarketEvent.prototype.key, MarketEvent.prototype.value)
    })
  })

  describe.skip('healthCheck', () => {
    
  })
})
