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
  let PaymentChannelNetworkService
  let AdminService
  let makerServiceInstance
  let takerServiceInstance
  let orderBookServiceInstance
  let paymentChannelNetworkServiceInstance
  let adminServiceInstance

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

    // All of these stubs are called with `new`, but in order to stub the return
    // value, we must use an Object or else we cannot match the values correctly.
    // see: https://github.com/sinonjs/sinon/issues/1676
    makerServiceInstance = { name: 'MakerService' }
    MakerService = sinon.stub().returns(makerServiceInstance)
    takerServiceInstance = { name: 'TakerService' }
    TakerService = sinon.stub().returns(takerServiceInstance)
    orderBookServiceInstance = { name: 'OrderBookService' }
    OrderBookService = sinon.stub().returns(orderBookServiceInstance)
    paymentChannelNetworkServiceInstance = { name: 'PaymentChannelNetworkService' }
    PaymentChannelNetworkService = sinon.stub().returns(paymentChannelNetworkServiceInstance)
    adminServiceInstance = { name: 'AdminService' }
    AdminService = sinon.stub().returns(adminServiceInstance)

    pathResolve = sinon.stub()
    RelayerClient.__set__('path', { resolve: pathResolve })

    readFileSync = sinon.stub()
    RelayerClient.__set__('readFileSync', readFileSync)

    proto = {
      MakerService,
      TakerService,
      OrderBookService,
      PaymentChannelNetworkService,
      AdminService,
      WatchMarketResponse: {
        ResponseType
      }
    }
    loadProto = sinon.stub().returns(proto)

    RelayerClient.__set__('loadProto', loadProto)

    callerStub = {
      wrap: sinon.stub()
    }
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

      RelayerClient.__set__('PRODUCTION', true)

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

    it('creates ssl credentials with local file if in development', () => {
      const fakePath = '/path/to/root.pem'
      const fakeCert = 'fakeydo'
      readFileSync.returns(fakeCert)

      RelayerClient.__set__('PRODUCTION', false)

      // eslint-disable-next-line
      new RelayerClient(idKeyPath, { host: relayerHost, certPath: fakePath }, logger)

      expect(readFileSync).to.have.been.calledOnce()
      expect(readFileSync).to.have.been.calledWith(fakePath)
      expect(createSslStub).to.have.been.calledWith(fakeCert)
    })

    it('creates ssl credentials', () => {
      RelayerClient.__set__('PRODUCTION', true)

      // eslint-disable-next-line
      new RelayerClient(idKeyPath, { host: relayerHost }, logger)

      expect(createSslStub).to.have.been.calledOnce()
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
      let fakeInterceptor
      let revert

      beforeEach(() => {
        fakeCreds = 'somecreds'
        createSslStub.returns(fakeCreds)
        fakeInterceptor = sinon.stub()
        revert = RelayerClient.__set__('grpcDeadlineInterceptor', fakeInterceptor)
        relayer = new RelayerClient(idKeyPath, { host: relayerHost }, logger)
      })

      afterEach(() => {
        revert()
      })

      it('creates a makerService', () => {
        const options = RelayerClient.__get__('GRPC_STREAM_OPTIONS')
        expect(proto.MakerService).to.have.been.calledWithExactly(relayer.address, fakeCreds, options)
        expect(callerStub.wrap).to.have.been.calledWithExactly(makerServiceInstance, {}, { interceptors: [fakeInterceptor] })
        expect(relayer).to.have.property('makerService')
      })

      it('creates a takerService', () => {
        const options = RelayerClient.__get__('GRPC_STREAM_OPTIONS')
        expect(proto.TakerService).to.have.been.calledWithExactly(relayer.address, fakeCreds, options)
        expect(callerStub.wrap).to.have.been.calledWithExactly(takerServiceInstance, {}, { interceptors: [fakeInterceptor] })
        expect(relayer).to.have.property('takerService')
      })

      it('creates an orderBookService', () => {
        const options = RelayerClient.__get__('GRPC_STREAM_OPTIONS')
        expect(proto.OrderBookService).to.have.been.calledWithExactly(relayer.address, fakeCreds, options)
        expect(callerStub.wrap).to.have.been.calledWithExactly(orderBookServiceInstance, {}, { interceptors: [fakeInterceptor] })
        expect(relayer).to.have.property('orderBookService')
      })

      it('creates a paymentChannelNetworkService', () => {
        expect(proto.PaymentChannelNetworkService).to.have.been.calledWithExactly(relayer.address, fakeCreds)
        expect(callerStub.wrap).to.have.been.calledWithExactly(paymentChannelNetworkServiceInstance, {}, { interceptors: [fakeInterceptor] })
        expect(relayer).to.have.property('paymentChannelNetworkService')
      })

      it('creates an adminService', () => {
        expect(proto.AdminService).to.have.been.calledWithExactly(relayer.address, fakeCreds)
        expect(callerStub.wrap).to.have.been.calledWithExactly(adminServiceInstance, {}, { interceptors: [fakeInterceptor] })
        expect(relayer).to.have.property('adminService')
      })
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

      callerStub.wrap.withArgs(orderBookServiceInstance, sinon.match.any, sinon.match.any).returns({ watchMarket })
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
