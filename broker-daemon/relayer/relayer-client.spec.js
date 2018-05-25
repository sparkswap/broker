const path = require('path')
const { sinon, rewire, delay, expect } = require('test/test-helper')

const RelayerClient = rewire(path.resolve('broker-daemon', 'relayer', 'relayer-client'))

describe('RelayerClient', () => {
  let grpcCredentialsInsecure
  let pathResolve
  let MarketEvent
  let loadProto
  let proto
  let MakerService
  let OrderBookService
  let HealthService
  let ResponseType = {
    EXISTING_EVENT: 'EXISTING_EVENT',
    EXISTING_EVENTS_DONE: 'EXISTING_EVENTS_DONE',
    NEW_EVENT: 'NEW_EVENT'
  }
  let fakeConsole

  let exchangeRpcHost = 'localhost:1337'

  beforeEach(() => {
    MarketEvent = sinon.stub()
    RelayerClient.__set__('MarketEvent', MarketEvent)

    MakerService = sinon.stub()
    OrderBookService = sinon.stub()
    HealthService = sinon.stub()

    pathResolve = sinon.stub()
    RelayerClient.__set__('path', { resolve: pathResolve })

    proto = {
      MakerService,
      OrderBookService,
      HealthService,
      WatchMarketResponse: {
        ResponseType
      }
    }
    loadProto = sinon.stub().returns(proto)

    RelayerClient.__set__('loadProto', loadProto)
    RelayerClient.__set__('EXCHANGE_RPC_HOST', exchangeRpcHost)

    fakeConsole = {
      info: sinon.stub(),
      error: sinon.stub()
    }
    RelayerClient.__set__('console', fakeConsole)

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
      expect(relayer.logger).to.be.equal(fakeConsole)
    })

    it('loads the proto', () => {
      const fakePath = 'mypath'
      pathResolve.returns(fakePath)
      const relayer = new RelayerClient()

      expect(pathResolve).to.have.been.calledOnce()
      expect(pathResolve).to.have.been.calledWith('./proto/relayer.proto')
      expect(loadProto).to.have.been.calledOnce()
      expect(loadProto).to.have.been.calledWith(fakePath)
      expect(relayer).to.have.property('proto')
      expect(relayer.proto).to.be.equal(proto)
    })

    it('creates the Maker service', () => {
      const fakeCreds = 'mypass'
      grpcCredentialsInsecure.returns(fakeCreds)

      const relayer = new RelayerClient()

      expect(MakerService).to.have.been.calledOnce()
      expect(MakerService).to.have.been.calledWithNew()
      expect(MakerService).to.have.been.calledWith(exchangeRpcHost, fakeCreds)
      expect(relayer).to.have.property('maker')
      expect(relayer.maker).to.be.instanceOf(MakerService)
    })

    it('creates the OrderBook service', () => {
      const fakeCreds = 'mypass'
      grpcCredentialsInsecure.returns(fakeCreds)

      const relayer = new RelayerClient()

      expect(OrderBookService).to.have.been.calledOnce()
      expect(OrderBookService).to.have.been.calledWithNew()
      expect(OrderBookService).to.have.been.calledWith(exchangeRpcHost, fakeCreds)
      expect(relayer).to.have.property('orderbook')
      expect(relayer.orderbook).to.be.instanceOf(OrderBookService)
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
        lastUpdated: '123'
      }

      stream = {
        on: sinon.stub()
      }

      watchMarket = sinon.stub().returns(stream)

      OrderBookService.prototype.watchMarket = watchMarket

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

    it('uses a 0 (int64 null value) for lastUpdated when a falsey value is passed', () => {
      params.lastUpdated = null
      relayer.watchMarket(store, params)

      expect(watchMarket).to.have.been.calledOnce()
      expect(watchMarket).to.have.been.calledWith(sinon.match({ lastUpdated: '0' }))
    })

    it('errors out when stream creation fails', () => {
      watchMarket.throws(new Error('fake error'))

      return expect(relayer.watchMarket(store, params)).to.be.rejectedWith(Error)
    })

    it('listens for events on the watchMarket stream', async () => {
      relayer.watchMarket(store, params)

      await delay(10)

      expect(stream.on).to.have.been.calledThrice()
      expect(stream.on).to.have.been.calledWith('data')
      expect(stream.on).to.have.been.calledWith('end')
      expect(stream.on).to.have.been.calledWith('error')
    })

    // TODO: figure out how to test an async throw
    xit('throws if the relayer ends the stream', async () => {
    })

    it('resolves when existing events are done', async () => {
      const fakeDone = { type: ResponseType.EXISTING_EVENTS_DONE }
      stream.on.withArgs('data').callsFake(async (evt, fn) => {
        await delay(10)
        fn(fakeDone)
      })

      return relayer.watchMarket(store, params)
    })

    it('puts existing events into the store', async () => {
      const fakeResponse = { type: ResponseType.EXISTING_EVENT, marketEvent: 'fakeEvent' }
      const fakeDone = { type: ResponseType.EXISTING_EVENTS_DONE }
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
      const fakeResponse = { type: ResponseType.EXISTING_EVENT, marketEvent: 'fakeEvent' }
      const fakeDone = { type: ResponseType.EXISTING_EVENTS_DONE }
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
