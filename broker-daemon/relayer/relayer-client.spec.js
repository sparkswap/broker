const path = require('path')
const { sinon, rewire, expect } = require('test/test-helper')

const RelayerClient = rewire(path.resolve('broker-daemon', 'relayer', 'relayer-client'))

describe('RelayerClient', () => {
  let logger
  let createSslStub
  let readFileSync
  let pathResolve
  let Identity
  let identityIdentify
  let MarketEvent
  let MarketWatcher
  let loadProto
  let proto
  let MakerService
  let TakerService
  let OrderBookService
  let HealthService
  let InfoService
  let PaymentChannelNetworkService
  let AdminService

  let ResponseType = {
    EXISTING_EVENT: 'EXISTING_EVENT',
    EXISTING_EVENTS_DONE: 'EXISTING_EVENTS_DONE',
    NEW_EVENT: 'NEW_EVENT',
    START_OF_EVENTS: 'START_OF_EVENTS'
  }
  let callerStub

  let relayerHost = 'localhost:1337'
  let idKeyPath = {
    privKeyPath: '/path/to/priv',
    pubKeyPath: '/path/to/pub'
  }
  let ENABLE_SSL = true

  beforeEach(() => {
    logger = {
      debug: sinon.stub(),
      info: sinon.stub(),
      error: sinon.stub()
    }
    identityIdentify = sinon.stub()
    Identity = {
      load: sinon.stub().returns({
        identify: identityIdentify
      })
    }
    logger = {
      info: sinon.stub(),
      debug: sinon.stub(),
      error: sinon.stub()
    }

    RelayerClient.__set__('Identity', Identity)

    MarketEvent = sinon.stub()
    RelayerClient.__set__('MarketEvent', MarketEvent)

    MarketWatcher = sinon.stub()
    RelayerClient.__set__('MarketWatcher', MarketWatcher)

    MakerService = sinon.stub()
    TakerService = sinon.stub()
    OrderBookService = sinon.stub()
    HealthService = sinon.stub()
    PaymentChannelNetworkService = sinon.stub()
    InfoService = sinon.stub()
    AdminService = sinon.stub()

    pathResolve = sinon.stub()
    RelayerClient.__set__('path', { resolve: pathResolve })

    readFileSync = sinon.stub()
    RelayerClient.__set__('readFileSync', readFileSync)

    proto = {
      MakerService,
      TakerService,
      OrderBookService,
      HealthService,
      PaymentChannelNetworkService,
      InfoService,
      AdminService,
      WatchMarketResponse: {
        ResponseType
      }
    }
    loadProto = sinon.stub().returns(proto)

    RelayerClient.__set__('loadProto', loadProto)

    callerStub = sinon.stub()
    RelayerClient.__set__('caller', callerStub)

    createSslStub = sinon.stub()

    RelayerClient.__set__('credentials', {
      createSsl: createSslStub
    })

    RelayerClient.__set__('ENABLE_SSL', ENABLE_SSL)
  })

  describe('new', () => {
    it('assigns a logger', () => {
      const relayer = new RelayerClient(idKeyPath, relayerHost, logger)

      expect(relayer).to.have.property('logger')
      expect(relayer.logger).to.be.equal(logger)
    })

    it('loads the proto', () => {
      const fakePath = 'mypath'
      pathResolve.returns(fakePath)
      const relayer = new RelayerClient(idKeyPath, { host: relayerHost }, logger)

      expect(pathResolve).to.have.been.calledOnce()
      expect(pathResolve).to.have.been.calledWith('./proto/relayer.proto')
      expect(loadProto).to.have.been.calledOnce()
      expect(loadProto).to.have.been.calledWith(fakePath)
      expect(relayer).to.have.property('proto')
      expect(relayer.proto).to.be.equal(proto)
    })

    it('loads the identity', () => {
      const fakeId = 'myid'
      Identity.load.returns(fakeId)

      const relayer = new RelayerClient(idKeyPath, relayerHost, logger)

      expect(Identity.load).to.have.been.calledOnce()
      expect(Identity.load).to.have.been.calledWith(idKeyPath.privKeyPath, idKeyPath.pubKeyPath)
      expect(relayer).to.have.property('identity', fakeId)
    })

    it('creates ssl credentials', () => {
      const fakePath = '/path/to/root.pem'
      const fakeCert = 'fakeydo'
      readFileSync.returns(fakeCert)

      // eslint-disable-next-line
      new RelayerClient(idKeyPath, { host: relayerHost, certPath: fakePath }, logger)

      expect(readFileSync).to.have.been.calledOnce()
      expect(readFileSync).to.have.been.calledWith(fakePath)
      expect(createSslStub).to.have.been.calledOnce()
      expect(createSslStub).to.have.been.calledWith(fakeCert)
    })

    it('sets ssl credentials for the services', () => {
      const fakeSslCreds = 'yourfake'
      createSslStub.returns(fakeSslCreds)

      const relayer = new RelayerClient(idKeyPath, { host: relayerHost }, logger)
      expect(relayer).to.have.property('credentials', fakeSslCreds)
    })

    describe('services', () => {
      let relayer
      let fakeCreds

      beforeEach(() => {
        fakeCreds = 'somecreds'
        createSslStub.returns(fakeCreds)
        relayer = new RelayerClient(idKeyPath, { host: relayerHost }, logger)
      })

      it('creates a makerService', () => expect(callerStub).to.have.been.calledWith(relayer.address, MakerService, fakeCreds))
      it('creates a takerService', () => expect(callerStub).to.have.been.calledWith(relayer.address, TakerService, fakeCreds))
      it('creates an orderBookService', () => expect(callerStub).to.have.been.calledWith(relayer.address, OrderBookService, fakeCreds))
      it('creates a healthService', () => expect(callerStub).to.have.been.calledWith(relayer.address, HealthService, fakeCreds))
      it('creates an infoService', () => expect(callerStub).to.have.been.calledWith(relayer.address, InfoService, fakeCreds))
      it('creates an adminService', () => expect(callerStub).to.have.been.calledWith(relayer.address, AdminService))
    })
  })

  describe('watchMarket', () => {
    let relayer
    let store
    let params
    let watchMarket
    let stream

    beforeEach(() => {
      stream = {
        on: sinon.stub()
      }

      watchMarket = sinon.stub().returns(stream)

      callerStub.withArgs(sinon.match.any, OrderBookService).returns({ watchMarket })
      relayer = new RelayerClient(idKeyPath, { host: relayerHost }, logger)
      store = {
        put: sinon.stub()
      }
      params = {
        baseSymbol: 'XYZ',
        counterSymbol: 'CBAA',
        lastUpdated: '123',
        sequence: '0'
      }
    })

    it('creates a watchMarket stream', () => {
      relayer.watchMarket(store, params)

      expect(watchMarket).to.have.been.calledOnce()
      expect(watchMarket).to.have.been.calledWith(params)
    })

    it('creates a market watcher', () => {
      relayer.watchMarket(store, params)

      expect(MarketWatcher).to.have.been.calledOnce()
      expect(MarketWatcher).to.have.been.calledWithNew()
      expect(MarketWatcher).to.have.been.calledWith(stream, store, ResponseType, logger)
    })

    it('returns the market watcher', () => {
      expect(relayer.watchMarket(store, params)).to.be.an.instanceOf(MarketWatcher)
    })
  })
})
