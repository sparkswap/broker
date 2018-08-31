const path = require('path')
const { sinon, rewire, delay, expect } = require('test/test-helper')

const RelayerClient = rewire(path.resolve('broker-daemon', 'relayer', 'relayer-client'))

describe('RelayerClient', () => {
  let createSslStub
  let createFromMetadataGeneratorStub
  let combineChannelCredentialsStub
  let readFileSync
  let pathResolve
  let Identity
  let identityIdentify
  let MarketEvent
  let loadProto
  let proto
  let MakerService
  let TakerService
  let OrderBookService
  let HealthService
  let InfoService
  let PaymentChannelNetworkService
  let ResponseType = {
    EXISTING_EVENT: 'EXISTING_EVENT',
    EXISTING_EVENTS_DONE: 'EXISTING_EVENTS_DONE',
    NEW_EVENT: 'NEW_EVENT',
    START_OF_EVENTS: 'START_OF_EVENTS'
  }
  let fakeConsole
  let callerStub

  let relayerHost = 'localhost:1337'
  let idKeyPath = {
    privKeyPath: '/path/to/priv',
    pubKeyPath: '/path/to/pub'
  }
  let ENABLE_SSL = true

  beforeEach(() => {
    identityIdentify = sinon.stub()
    Identity = {
      load: sinon.stub().returns({
        identify: identityIdentify
      })
    }
    RelayerClient.__set__('Identity', Identity)

    MarketEvent = sinon.stub()
    RelayerClient.__set__('MarketEvent', MarketEvent)

    MakerService = sinon.stub()
    TakerService = sinon.stub()
    OrderBookService = sinon.stub()
    HealthService = sinon.stub()
    PaymentChannelNetworkService = sinon.stub()
    InfoService = sinon.stub()

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
      WatchMarketResponse: {
        ResponseType
      }
    }
    loadProto = sinon.stub().returns(proto)

    RelayerClient.__set__('loadProto', loadProto)

    callerStub = sinon.stub()
    RelayerClient.__set__('caller', callerStub)

    fakeConsole = {
      info: sinon.stub(),
      error: sinon.stub()
    }
    RelayerClient.__set__('console', fakeConsole)

    createSslStub = sinon.stub()
    createFromMetadataGeneratorStub = sinon.stub()
    combineChannelCredentialsStub = sinon.stub()

    RelayerClient.__set__('credentials', {
      createSsl: createSslStub,
      createFromMetadataGenerator: createFromMetadataGeneratorStub,
      combineChannelCredentials: combineChannelCredentialsStub
    })

    RelayerClient.__set__('ENABLE_SSL', ENABLE_SSL)
  })

  describe('new', () => {
    it('assigns a logger', () => {
      const logger = {}
      const relayer = new RelayerClient(idKeyPath, relayerHost, logger)

      expect(relayer).to.have.property('logger')
      expect(relayer.logger).to.be.equal(logger)
    })

    it('loads the proto', () => {
      const fakePath = 'mypath'
      pathResolve.returns(fakePath)
      const relayer = new RelayerClient(idKeyPath, { host: relayerHost })

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

      const relayer = new RelayerClient(idKeyPath, relayerHost)

      expect(Identity.load).to.have.been.calledOnce()
      expect(Identity.load).to.have.been.calledWith(idKeyPath.privKeyPath, idKeyPath.pubKeyPath)
      expect(relayer).to.have.property('identity', fakeId)
    })

    it('creates ssl credentials', () => {
      const fakePath = '/path/to/root.pem'
      const fakeCert = 'fakeydo'
      readFileSync.returns(fakeCert)

      // eslint-disable-next-line
      new RelayerClient(idKeyPath, { host: relayerHost, certPath: fakePath })

      expect(readFileSync).to.have.been.calledOnce()
      expect(readFileSync).to.have.been.calledWith(fakePath)
      expect(createSslStub).to.have.been.calledOnce()
      expect(createSslStub).to.have.been.calledWith(fakeCert)
    })

    it('creates call credentials using the custom signer', () => {
      // eslint-disable-next-line
      new RelayerClient(idKeyPath, { host: relayerHost })

      const generator = createFromMetadataGeneratorStub.args[0][0]

      const fakeMeta = 'fakemetadata'
      const fakeUrl = 'someurl'
      const fakeCallback = sinon.stub()
      identityIdentify.returns(fakeMeta)

      generator({ service_url: fakeUrl }, fakeCallback)

      expect(identityIdentify).to.have.been.calledOnce()
      expect(identityIdentify).to.have.been.calledWithExactly()
      expect(fakeCallback).to.have.been.calledOnce()
      expect(fakeCallback).to.have.been.calledWith(null, fakeMeta)
    })

    it('combines ssl and custom call credentials', () => {
      const fakeCallCreds = 'myfake'
      const fakeSslCreds = 'yourfake'
      const fakeCombined = 'ourfake'
      createSslStub.returns(fakeSslCreds)
      createFromMetadataGeneratorStub.returns(fakeCallCreds)
      combineChannelCredentialsStub.returns(fakeCombined)

      const relayer = new RelayerClient(idKeyPath, { host: relayerHost })

      expect(combineChannelCredentialsStub).to.have.been.calledOnce()
      expect(combineChannelCredentialsStub).to.have.been.calledWith(fakeSslCreds, fakeCallCreds)
      expect(relayer).to.have.property('credentials', fakeCombined)
    })

    describe('services', () => {
      let relayer
      let fakeCreds

      beforeEach(() => {
        fakeCreds = 'somecreds'
        combineChannelCredentialsStub.returns(fakeCreds)
        relayer = new RelayerClient(idKeyPath, { host: relayerHost })
      })

      it('creates a makerService', () => expect(callerStub).to.have.been.calledWith(relayer.address, MakerService, fakeCreds))
      it('creates a takerService', () => expect(callerStub).to.have.been.calledWith(relayer.address, TakerService, fakeCreds))
      it('creates an orderBookService', () => expect(callerStub).to.have.been.calledWith(relayer.address, OrderBookService, fakeCreds))
      it('creates a healthService', () => expect(callerStub).to.have.been.calledWith(relayer.address, HealthService, fakeCreds))
      it('creates an infoService', () => expect(callerStub).to.have.been.calledWith(relayer.address, InfoService, fakeCreds))
    })
  })

  describe('watchMarket', () => {
    let relayer
    let store
    let params
    let watchMarket
    let stream
    let migrateStore

    beforeEach(() => {
      stream = {
        on: sinon.stub()
      }

      watchMarket = sinon.stub().returns(stream)

      callerStub.withArgs(sinon.match.any, OrderBookService).returns({ watchMarket })
      relayer = new RelayerClient(idKeyPath, { host: relayerHost })
      store = {
        put: sinon.stub()
      }
      params = {
        baseSymbol: 'XYZ',
        counterSymbol: 'CBAA',
        lastUpdated: '123'
      }

      MarketEvent.prototype.key = 'key'
      MarketEvent.prototype.value = 'value'

      migrateStore = sinon.stub().resolves()

      RelayerClient.__set__('migrateStore', migrateStore)
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

      return expect(relayer.watchMarket(store, params)).to.eventually.be.rejectedWith(Error)
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

    it('deletes the store when facing the start of events', async () => {
      const fakeNew = { type: ResponseType.START_OF_EVENTS }
      const fakeDone = { type: ResponseType.EXISTING_EVENTS_DONE }

      stream.on.withArgs('data').callsFake(async (evt, fn) => {
        await delay(10)
        fn(fakeNew)
        await delay(10)
        fn(fakeDone)
      })

      await relayer.watchMarket(store, params)

      expect(migrateStore).to.have.been.calledOnce()
      expect(migrateStore).to.have.been.calledWith(store, store, sinon.match.func)

      const migrator = migrateStore.args[0][2]

      expect(migrator('hello')).to.be.eql({ type: 'del', key: 'hello' })
    })

    it('waits for migrating to be done before processing more events', async () => {
      const fakeNew = { type: ResponseType.START_OF_EVENTS }
      const fakeResponse = { type: ResponseType.EXISTING_EVENT, marketEvent: 'fakeEvent' }
      const fakeDone = { type: ResponseType.EXISTING_EVENTS_DONE }

      let callCount

      migrateStore.callsFake(() => { return delay(15) })

      stream.on.withArgs('data').callsFake(async (evt, fn) => {
        await delay(10)
        fn(fakeNew)
        await delay(10)
        fn(fakeResponse)
        await delay(1)

        callCount = store.put.callCount

        fn(fakeDone)
      })

      await relayer.watchMarket(store, params)

      expect(callCount).to.be.a('number')
      expect(callCount).to.be.eql(0)
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
