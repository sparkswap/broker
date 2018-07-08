const path = require('path')
const { expect, sinon, rewire } = require('test/test-helper')

const BrokerDaemon = rewire(path.resolve('broker-daemon', 'index'))

describe('broker daemon', () => {
  let rpcServer
  let interchainRouter
  let eventEmitter
  let level
  let sublevel
  let store
  let RelayerClient
  let Orderbook
  let BlockOrderWorker
  let LndEngine
  let logger
  let brokerDaemon
  let rpcServerListenSpy
  let interchainRouterListenSpy
  let CONFIG

  beforeEach(() => {
    level = sinon.stub().returns('fake-level')
    store = {
      sublevel: sinon.stub().returns('fake-sublevel')
    }
    sublevel = sinon.stub().returns(store)
    RelayerClient = sinon.stub()
    rpcServerListenSpy = sinon.spy()
    rpcServer = sinon.stub()
    rpcServer.prototype.listen = rpcServerListenSpy
    interchainRouterListenSpy = sinon.stub()
    interchainRouter = sinon.stub()
    interchainRouter.prototype.listen = interchainRouterListenSpy
    eventEmitter = sinon.stub()
    logger = {
      error: sinon.spy(),
      info: sinon.spy()
    }
    LndEngine = sinon.stub()
    Orderbook = sinon.stub()
    Orderbook.prototype.initialize = sinon.stub()
    BlockOrderWorker = sinon.stub()
    BlockOrderWorker.prototype.initialize = sinon.stub()
    CONFIG = {
      currencies: [
        {
          'name': 'Bitcoin',
          'symbol': 'BTC',
          'quantumsPerCommon': '100000000'
        },
        {
          'name': 'Litecoin',
          'symbol': 'LTC',
          'quantumsPerCommon': '100000000'
        },
        {
          'name': 'Akoin',
          'symbol': 'ABC',
          'quantumsPerCommon': '100000000'
        },
        {
          'name': 'Xcoin',
          'symbol': 'XYZ',
          'quantumsPerCommon': '100000000'
        }
      ]
    }

    BrokerDaemon.__set__('CONFIG', CONFIG)
    BrokerDaemon.__set__('Orderbook', Orderbook)
    BrokerDaemon.__set__('BlockOrderWorker', BlockOrderWorker)
    BrokerDaemon.__set__('LndEngine', LndEngine)
    BrokerDaemon.__set__('RelayerClient', RelayerClient)
    BrokerDaemon.__set__('level', level)
    BrokerDaemon.__set__('sublevel', sublevel)
    BrokerDaemon.__set__('events', eventEmitter)
    BrokerDaemon.__set__('BrokerRPCServer', rpcServer)
    BrokerDaemon.__set__('InterchainRouter', interchainRouter)
    BrokerDaemon.__set__('logger', logger)

    brokerDaemon = new BrokerDaemon()
  })

  it('creates a relayer client', () => {
    expect(RelayerClient).to.have.been.calledOnce()
    expect(RelayerClient).to.have.been.calledWithNew()
    expect(brokerDaemon).to.have.property('relayer')
    expect(brokerDaemon.relayer).to.be.instanceOf(RelayerClient)
  })

  it('creates an empty orderbooks map', () => {
    expect(brokerDaemon).to.have.property('orderbooks')
    expect(brokerDaemon.orderbooks).to.be.eql(new Map())
  })

  it('instantiates an engine', () => {
    expect(LndEngine).to.have.been.calledOnce()
    expect(LndEngine).to.have.been.calledWith(brokerDaemon.lndRpcHost)
    expect(LndEngine).to.have.been.calledWith(sinon.match.any, { logger, tlsCertPath: brokerDaemon.lndTlsCert, macaroonPath: brokerDaemon.lndMacaroon })
    expect(brokerDaemon).to.have.property('engine')
    expect(brokerDaemon.engine).to.be.instanceOf(LndEngine)
  })

  describe('InterchainRouter', () => {
    it('creates an InterchainRouter', () => {
      expect(interchainRouter).to.have.been.calledOnce()
      expect(interchainRouter).to.have.been.calledWithNew()
    })

    it('provides the logger to the InterchainRouter', () => {
      expect(interchainRouter).to.have.been.calledWith(sinon.match({ logger: logger }))
    })

    it('provides the ordersByHash to the InterchainRouter', () => {
      expect(interchainRouter).to.have.been.calledWith(sinon.match({ ordersByHash: brokerDaemon.blockOrderWorker.ordersByHash }))
    })

    it('assigns the InterchainRouter', () => {
      expect(brokerDaemon).to.have.property('interchainRouter')
      expect(brokerDaemon.interchainRouter).to.be.instanceOf(interchainRouter)
    })
  })

  describe('BlockOrderWorker', () => {
    it('creates a BlockOrderWorker', () => {
      expect(BlockOrderWorker).to.have.been.calledOnce()
      expect(BlockOrderWorker).to.have.been.calledWithNew()
    })

    it('creates a sublevel for block orders', () => {
      expect(store.sublevel).to.have.been.calledOnce()
      expect(store.sublevel).to.have.been.calledWith('block-orders')
      expect(BlockOrderWorker).to.have.been.calledWith(sinon.match({ store: 'fake-sublevel' }))
    })

    it('provides the relayer to the BlockOrderWorker', () => {
      expect(BlockOrderWorker).to.have.been.calledWith(sinon.match({ relayer: sinon.match.instanceOf(RelayerClient) }))
    })

    it('provides the engine to the BlockOrderWorker', () => {
      expect(BlockOrderWorker).to.have.been.calledWith(sinon.match({ engine: sinon.match.instanceOf(LndEngine) }))
    })

    it('provides the orderbooks to the BlockOrderWorker', () => {
      expect(BlockOrderWorker).to.have.been.calledWith(sinon.match({ orderbooks: sinon.match.instanceOf(Map) }))
    })

    it('provides the logger to the BlockOrderWorker', () => {
      expect(BlockOrderWorker).to.have.been.calledWith(sinon.match({ logger: logger }))
    })

    it('assigns the BlockOrderWorker', () => {
      expect(brokerDaemon).to.have.property('blockOrderWorker')
      expect(brokerDaemon.blockOrderWorker).to.be.instanceOf(BlockOrderWorker)
    })
  })

  describe('initializeMarket', () => {
    beforeEach(() => {
      Orderbook.prototype.initialize.resolves()
    })

    it('creates an orderbook for the market', async () => {
      const marketName = 'ABC/XYZ'
      await brokerDaemon.initializeMarket(marketName)

      expect(Orderbook).to.have.been.calledOnce()
      expect(Orderbook).to.have.been.calledWithNew()
      expect(Orderbook).to.have.been.calledWith(marketName)
    })

    it('assigns the orderbook to the market hash', async () => {
      const marketName = 'ABC/XYZ'
      await brokerDaemon.initializeMarket(marketName)

      expect(brokerDaemon.orderbooks.get(marketName)).to.be.instanceOf(Orderbook)
    })

    it('provides a relayer', async () => {
      const marketName = 'ABC/XYZ'

      await brokerDaemon.initializeMarket(marketName)

      expect(Orderbook).to.have.been.calledWith(sinon.match.any, sinon.match.instanceOf(RelayerClient))
    })

    it('creates a sublevel store for the orderbook', async () => {
      const marketName = 'ABC/XYZ'

      await brokerDaemon.initializeMarket(marketName)

      expect(store.sublevel).to.have.been.calledWith(marketName)
      expect(Orderbook).to.have.been.calledWith(sinon.match.any, sinon.match.any, 'fake-sublevel')
    })

    it('provides a logger', async () => {
      const marketName = 'ABC/XYZ'

      await brokerDaemon.initializeMarket(marketName)

      expect(Orderbook).to.have.been.calledWith(sinon.match.any, sinon.match.any, sinon.match.any, brokerDaemon.logger)
    })

    it('initializes the market', async () => {
      const marketName = 'ABC/XYZ'

      await brokerDaemon.initializeMarket(marketName)

      expect(Orderbook.prototype.initialize).to.have.been.calledOnce()
    })

    // TODO: test this a better way
    it('resolves once the orderbook resolves', () => {
      const marketName = 'ABC/XYZ'

      expect(brokerDaemon.initializeMarket(marketName)).to.be.a('promise')
    })
  })

  describe('#initializeMarkets', () => {
    beforeEach(() => {
      Orderbook.prototype.initialize.resolves()
    })

    it('initializes all markets', async () => {
      const marketNames = ['ABC/XYZ', 'BTC/LTC']

      await brokerDaemon.initializeMarkets(marketNames)

      expect(Orderbook).to.have.been.calledTwice()
      expect(Orderbook).to.have.been.calledWith(marketNames[0])
      expect(Orderbook).to.have.been.calledWith(marketNames[1])
      expect(brokerDaemon.orderbooks.size).to.be.equal(2)
    })

    // TODO: test this a better way
    it('resolves once all orderbooks have resolved', () => {
      const marketName = 'ABC/XYZ'

      expect(brokerDaemon.initializeMarkets([marketName])).to.be.a('promise')
    })
  })

  describe('#initialize', () => {
    it('starts a grpc server', async () => {
      await brokerDaemon.initialize()
      expect(rpcServerListenSpy).to.have.been.calledWith(brokerDaemon.rpcAddress)
    })

    it('starts the interchain router', async () => {
      await brokerDaemon.initialize()
      expect(interchainRouterListenSpy).to.have.been.calledWith(brokerDaemon.interchainRouterAddress)
    })

    it('initializes markets', async () => {
      const markets = 'BTC/LTC,ABC/XYZ'
      brokerDaemon = new BrokerDaemon(null, null, markets)
      brokerDaemon.initializeMarkets = sinon.stub().resolves()

      await brokerDaemon.initialize()

      expect(brokerDaemon.initializeMarkets).to.have.been.calledOnce()
      expect(brokerDaemon.initializeMarkets).to.have.been.calledWith(markets.split(','))
    })

    it('initializes the block order worker', async () => {
      await brokerDaemon.initialize()

      expect(BlockOrderWorker.prototype.initialize).to.have.been.calledOnce()
    })
  })

  describe('rpcAddress', () => {
    let defaultAddress

    beforeEach(() => {
      defaultAddress = '0.0.0.0:27492'
    })

    it('sets a default address if parameter and env is not set', async () => {
      expect(brokerDaemon.rpcAddress).to.be.eql(defaultAddress)
    })

    it('sets an rpc address from an ENV variable', async () => {
      const rpcAddress = 'rpcAddress'
      BrokerDaemon.__set__('RPC_ADDRESS', rpcAddress)
      brokerDaemon = new BrokerDaemon()
      expect(brokerDaemon.rpcAddress).to.be.eql(rpcAddress)
    })

    it('sets an RPC address from parameters', async () => {
      let customRpcAddress = '127.0.0.1'
      brokerDaemon = new BrokerDaemon(customRpcAddress)
      expect(brokerDaemon.rpcAddress).to.be.eql(customRpcAddress)
    })
  })

  describe('interchainRouterAddress', () => {
    let defaultAddress

    beforeEach(() => {
      defaultAddress = '0.0.0.0:40369'
    })

    it('sets a default address if parameter and env is not set', async () => {
      expect(brokerDaemon.interchainRouterAddress).to.be.eql(defaultAddress)
    })

    it('sets an rpc address from an ENV variable', async () => {
      const customIRAddress = '127.0.0.1'
      BrokerDaemon.__set__('INTERCHAIN_ROUTER_ADDRESS', customIRAddress)
      brokerDaemon = new BrokerDaemon()
      expect(brokerDaemon.interchainRouterAddress).to.be.eql(customIRAddress)
    })

    it('sets an RPC address from parameters', async () => {
      let customIRAddress = '127.0.0.1'
      brokerDaemon = new BrokerDaemon(null, null, null, customIRAddress)
      expect(brokerDaemon.interchainRouterAddress).to.be.eql(customIRAddress)
    })
  })
})
