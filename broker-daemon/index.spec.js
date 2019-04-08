const path = require('path')
const { expect, sinon, rewire } = require('test/test-helper')

const BrokerDaemon = rewire(path.resolve('broker-daemon', 'index'))

describe('broker daemon', () => {
  let network
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
  let rpcListenStub
  let interchainRouterListenSpy
  let CONFIG
  let engines
  let privRpcKeyPath
  let pubRpcKeyPath
  let privIdKeyPath
  let pubIdKeyPath
  let rpcAddress
  let rpcInternalProxyAddress
  let rpcHttpProxyAddress
  let rpcHttpProxyMethods
  let interchainRouterAddress
  let dataDir
  let marketNames
  let disableAuth
  let enableCors
  let isCertSelfSigned
  let relayerOptions
  let brokerDaemonOptions
  let rpcUser
  let rpcPass

  beforeEach(() => {
    level = sinon.stub().returns('fake-level')
    store = {
      sublevel: sinon.stub().returns('fake-sublevel')
    }
    sublevel = sinon.stub().returns(store)
    RelayerClient = sinon.stub()
    rpcListenStub = sinon.stub()
    rpcServer = sinon.stub()
    rpcServer.prototype.listen = rpcListenStub
    interchainRouterListenSpy = sinon.stub()
    interchainRouter = sinon.stub()
    interchainRouter.prototype.listen = interchainRouterListenSpy
    eventEmitter = sinon.stub()
    logger = {
      error: sinon.spy(),
      info: sinon.spy()
    }
    LndEngine = sinon.stub()
    LndEngine.prototype.validateNodeConfig = sinon.stub().resolves()
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

    network = 'mainnet'
    privRpcKeyPath = '/my/private/rpc/key/path'
    pubRpcKeyPath = '/my/public/rpc/key/path'
    privIdKeyPath = '/my/private/id/key/path'
    pubIdKeyPath = '/my/public/id/key/path'
    rpcAddress = '0.0.0.0:27492'
    rpcInternalProxyAddress = 'my-fake-domain:27492'
    rpcHttpProxyAddress = '0.0.0.0:28592'
    rpcHttpProxyMethods = [ '/v1/admin/healthcheck' ]
    interchainRouterAddress = '0.0.0.0:40369'
    dataDir = '/datadir'
    marketNames = [ 'BTC/LTC' ]
    engines = {
      BTC: {
        type: 'LND',
        lndRpc: 'localhost:1234',
        lndTls: '~/.lnd/my-cert',
        lndMacaroon: '~/.lnd/my-macaroon'
      },
      LTC: {
        type: 'LND',
        lndRpc: 'localhost:1234',
        lndTls: '~/.lnd/my-cert',
        lndMacaroon: '~/.lnd/my-macaroon'
      }
    }
    disableAuth = false
    enableCors = true
    isCertSelfSigned = false
    relayerOptions = {
      relayerCertPath: '/fake/path',
      relayerRpcHost: 'fakehost'
    }

    rpcUser = 'fakeUser'
    rpcPass = 'fakePass'

    brokerDaemonOptions = {
      privRpcKeyPath,
      pubRpcKeyPath,
      privIdKeyPath,
      pubIdKeyPath,
      rpcAddress,
      rpcInternalProxyAddress,
      rpcHttpProxyAddress,
      rpcHttpProxyMethods,
      interchainRouterAddress,
      dataDir,
      marketNames,
      engines,
      disableAuth,
      enableCors,
      isCertSelfSigned,
      rpcUser,
      rpcPass,
      relayerOptions,
      network
    }
  })

  it('throws if required keys are not defined', () => {
    expect(() => new BrokerDaemon({})).to.throw()
  })

  it('throws if network is null', () => {
    expect(() => new BrokerDaemon({})).to.throw('Network is required to create')
  })

  it('throws if the public key path is null', () => {
    expect(() => new BrokerDaemon({ network, privIdKeyPath: 'somepath' })).to.throw('Public Key path is required')
  })

  it('throws if the private key path is null', () => {
    expect(() => new BrokerDaemon({ network, privIdKeyPath: null })).to.throw('Private Key path is required')
  })

  it('throws for unrecognized engine types', () => {
    brokerDaemonOptions.engines.BTC.type = 'LIT'
    expect(() => new BrokerDaemon(brokerDaemonOptions)).to.throw('Unknown engine type')
  })

  describe('daemon properties', () => {
    beforeEach(() => {
      brokerDaemon = new BrokerDaemon(brokerDaemonOptions)
    })

    it('creates an empty orderbooks map', () => {
      expect(brokerDaemon).to.have.property('orderbooks')
      expect(brokerDaemon.orderbooks).to.be.eql(new Map())
    })

    describe('engines', () => {
      it('instantiates the engines', () => {
        expect(brokerDaemon).to.have.property('engines')
        expect(brokerDaemon.engines).to.be.a('Map')
        expect(brokerDaemon.engines.get('BTC')).to.be.an.instanceOf(LndEngine)
      })

      it('provides lnd parameters to lnd engine', () => {
        expect(LndEngine).to.have.been.calledTwice()
        expect(LndEngine).to.have.been.calledWith(engines.BTC.lndRpc, 'BTC', { logger, tlsCertPath: engines.BTC.lndTls, macaroonPath: engines.BTC.lndMacaroon })
        expect(LndEngine).to.have.been.calledWith(engines.BTC.lndRpc, 'LTC', { logger, tlsCertPath: engines.BTC.lndTls, macaroonPath: engines.BTC.lndMacaroon })
      })
    })

    describe('BrokerRPCServer', () => {
      it('creates a BrokerRPCServer', () => {
        expect(rpcServer).to.have.been.calledOnce()
        expect(rpcServer).to.have.been.calledWithNew()
        expect(brokerDaemon.rpcServer).to.be.an.instanceOf(rpcServer)
      })

      it('sets the rpc address', () => {
        expect(rpcServer).to.have.been.calledWith(sinon.match({ rpcAddress: rpcInternalProxyAddress }))
      })

      it('defaults to localhost', () => {
        delete brokerDaemonOptions.rpcInternalProxyAddress
        // eslint-disable-next-line
        new BrokerDaemon(brokerDaemonOptions)
        expect(rpcServer).to.have.been.calledWith(sinon.match({ rpcAddress: 'localhost:27492' }))
      })

      it('sets the rpc http proxy address', () => {
        expect(rpcServer).to.have.been.calledWith(sinon.match({ rpcHttpProxyAddress }))
      })

      it('sets the rpc http proxy methods', () => {
        expect(rpcServer).to.have.been.calledWith(sinon.match({ rpcHttpProxyMethods }))
      })

      it('sets the logger', () => {
        expect(rpcServer).to.have.been.calledWith(sinon.match({ logger }))
      })

      it('sets the engines', () => {
        expect(rpcServer).to.have.been.calledWith(sinon.match({ engines: brokerDaemon.engines }))
      })

      it('sets the relayer client', () => {
        expect(rpcServer).to.have.been.calledWith(sinon.match({ relayer: brokerDaemon.relayer }))
      })

      it('sets the block order worker', () => {
        expect(rpcServer).to.have.been.calledWith(sinon.match({ blockOrderWorker: brokerDaemon.blockOrderWorker }))
      })

      it('sets the private key path', () => {
        expect(rpcServer).to.have.been.calledWith(sinon.match({ privKeyPath: privRpcKeyPath }))
      })

      it('sets the public key path', () => {
        expect(rpcServer).to.have.been.calledWith(sinon.match({ pubKeyPath: pubRpcKeyPath }))
      })

      it('sets the auth', () => {
        expect(rpcServer).to.have.been.calledWith(sinon.match({ disableAuth }))
      })

      it('sets cors', () => {
        expect(rpcServer).to.have.been.calledWith(sinon.match({ enableCors }))
      })

      it('sets cert signer', () => {
        expect(rpcServer).to.have.been.calledWith(sinon.match({ isCertSelfSigned }))
      })

      it('sets the username', () => {
        expect(rpcServer).to.have.been.calledWith(sinon.match({ rpcUser }))
      })

      it('sets the password', () => {
        expect(rpcServer).to.have.been.calledWith(sinon.match({ rpcPass }))
      })
    })

    describe('InterchainRouter', () => {
      it('creates an InterchainRouter', () => {
        expect(interchainRouter).to.have.been.calledOnce()
        expect(interchainRouter).to.have.been.calledWithNew()
      })

      it('provides the logger to the InterchainRouter', () => {
        expect(interchainRouter).to.have.been.calledWith(sinon.match({ logger: logger }))
      })

      it('provides the engines to the InterchainRouter', () => {
        expect(interchainRouter).to.have.been.calledWith(sinon.match({ engines: sinon.match.instanceOf(Map) }))
        expect(interchainRouter.args[0][0].engines.values().next().value).to.be.an.instanceOf(LndEngine)
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

      it('provides the engines to the BlockOrderWorker', () => {
        expect(BlockOrderWorker).to.have.been.calledWith(sinon.match({ engines: sinon.match.instanceOf(Map) }))
        expect(BlockOrderWorker.args[0][0].engines.values().next().value).to.be.an.instanceOf(LndEngine)
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

    describe('RelayerClient', () => {
      it('creates a relayer client', () => {
        const relayerRpcHost = brokerDaemonOptions.relayerOptions.relayerRpcHost
        const relayerCertPath = brokerDaemonOptions.relayerOptions.relayerCertPath

        expect(RelayerClient).to.have.been.calledWith(sinon.match.any, sinon.match({ host: relayerRpcHost, certPath: relayerCertPath }), sinon.match.any)
        expect(RelayerClient).to.have.been.calledWithNew()
      })

      it('has a \'relayer\' property', () => {
        expect(brokerDaemon).to.have.property('relayer')
        expect(brokerDaemon.relayer).to.be.instanceOf(RelayerClient)
      })
    })
  })

  describe('initializeMarket', () => {
    beforeEach(() => {
      Orderbook.prototype.initialize.resolves()
      brokerDaemon = new BrokerDaemon(brokerDaemonOptions)
      brokerDaemon.engines = new Map([
        [ 'ABC', {} ],
        [ 'XYZ', {} ]
      ])
    })

    it('throws if currency config is not available for one of the currencies', () => {
      return expect(brokerDaemon.initializeMarket('BTC/TRX')).to.eventually.be.rejectedWith('Currency config is required')
    })

    it('throws if an engine is not available for one of the currencies', () => {
      return expect(brokerDaemon.initializeMarket('BTC/XYZ')).to.eventually.be.rejectedWith('engine is required')
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
      brokerDaemon = new BrokerDaemon(brokerDaemonOptions)
      brokerDaemon.engines = new Map([
        [ 'ABC', {} ],
        [ 'BTC', {} ],
        [ 'LTC', {} ],
        [ 'XYZ', {} ]
      ])
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

  describe('#initializeBlockOrder', () => {
    let engineValidatePromise

    beforeEach(() => {
      engineValidatePromise = sinon.stub()
      brokerDaemon = new BrokerDaemon(brokerDaemonOptions)
    })

    it('calls initialize on the blockorder', async () => {
      await brokerDaemon.initializeBlockOrder(engineValidatePromise)
      expect(brokerDaemon.blockOrderWorker.initialize).to.have.been.calledOnceWith(engineValidatePromise)
    })
  })

  describe('#initialize', () => {
    let validatePromise

    beforeEach(() => {
      validatePromise = sinon.stub()
      brokerDaemon = new BrokerDaemon(brokerDaemonOptions)
      brokerDaemon.validateEngines = sinon.stub().returns(validatePromise)
      brokerDaemon.initializeMarkets = sinon.stub().resolves()
    })

    beforeEach(async () => {
      await brokerDaemon.initialize()
    })

    it('starts a gRPC server', () => {
      expect(rpcListenStub).to.have.been.calledOnce()
      expect(rpcListenStub).to.have.been.calledWith(rpcAddress)
    })

    it('starts the interchain router', () => {
      expect(interchainRouterListenSpy).to.have.been.calledOnce()
      expect(interchainRouterListenSpy).to.have.been.calledWith(brokerDaemon.interchainRouterAddress)
    })

    it('validates the engines', () => {
      expect(brokerDaemon.validateEngines).to.have.been.calledOnce()
    })

    it('initializes markets', () => {
      expect(brokerDaemon.initializeMarkets).to.have.been.calledOnce()
      expect(brokerDaemon.initializeMarkets).to.have.been.calledWith(marketNames)
    })

    it('initializes the block order worker', async () => {
      expect(BlockOrderWorker.prototype.initialize).to.have.been.calledOnceWith(validatePromise)
    })
  })

  describe('#validateEngines', () => {
    let btcEngine
    let ltcEngine

    beforeEach(() => {
      brokerDaemon = new BrokerDaemon(brokerDaemonOptions)

      btcEngine = {
        validateEngine: sinon.stub().resolves()
      }
      ltcEngine = {
        validateEngine: sinon.stub().resolves()
      }
      brokerDaemon.engines = new Map([
        [ 'BTC', btcEngine ],
        [ 'LTC', ltcEngine ]
      ])
    })

    it('validates the node config on each engine', () => {
      brokerDaemon.validateEngines()

      expect(btcEngine.validateEngine).to.have.been.called()
      expect(ltcEngine.validateEngine).to.have.been.called()
    })

    it('synchronously validates the node config on each engine', async () => {
      await brokerDaemon.validateEngines()

      expect(btcEngine.validateEngine).to.have.been.called()
      expect(ltcEngine.validateEngine).to.have.been.called()
    })
  })

  describe('rpcAddress', () => {
    it('sets a default address if parameter is not set', async () => {
      const defaultRpcAddress = BrokerDaemon.__get__('DEFAULT_RPC_ADDRESS')
      brokerDaemonOptions.rpcAddress = null
      brokerDaemon = new BrokerDaemon(brokerDaemonOptions)
      expect(brokerDaemon.rpcAddress).to.be.eql(defaultRpcAddress)
    })

    it('sets an RPC address from parameters', async () => {
      brokerDaemon = new BrokerDaemon(brokerDaemonOptions)
      expect(brokerDaemon.rpcAddress).to.be.eql(rpcAddress)
    })
  })

  describe('interchainRouterAddress', () => {
    it('sets a default address if parameter is not set', async () => {
      const defaultAddress = BrokerDaemon.__get__('DEFAULT_INTERCHAIN_ROUTER_ADDRESS')
      brokerDaemonOptions.interchainRouterAddress = null
      brokerDaemon = new BrokerDaemon(brokerDaemonOptions)
      expect(brokerDaemon.interchainRouterAddress).to.be.eql(defaultAddress)
    })

    it('sets an RPC address from parameters', async () => {
      brokerDaemon = new BrokerDaemon(brokerDaemonOptions)
      expect(brokerDaemon.interchainRouterAddress).to.be.eql(interchainRouterAddress)
    })
  })

  describe('dataDir', () => {
    it('sets a default data directory if parameter is not set', async () => {
      const defaultDir = BrokerDaemon.__get__('DEFAULT_DATA_DIR')
      brokerDaemonOptions.dataDir = null
      brokerDaemon = new BrokerDaemon(brokerDaemonOptions)
      expect(brokerDaemon.dataDir).to.be.eql(defaultDir)
    })

    it('sets an RPC address from parameters', async () => {
      brokerDaemon = new BrokerDaemon(brokerDaemonOptions)
      expect(brokerDaemon.dataDir).to.be.eql(dataDir)
    })
  })

  describe('rpcUser', () => {
    it('defaults to null', () => {
      delete brokerDaemonOptions.rpcUser
      brokerDaemon = new BrokerDaemon(brokerDaemonOptions)
      expect(brokerDaemon.rpcUser).to.be.null()
    })

    it('sets an RPC address from parameters', async () => {
      brokerDaemonOptions.rpcUser = 'myuser'
      brokerDaemon = new BrokerDaemon(brokerDaemonOptions)
      expect(brokerDaemon.rpcUser).to.be.eql('myuser')
    })
  })

  describe('rpcPass', () => {
    it('defaults to null', () => {
      delete brokerDaemonOptions.rpcPass
      brokerDaemon = new BrokerDaemon(brokerDaemonOptions)
      expect(brokerDaemon.rpcPass).to.be.null()
    })

    it('sets an RPC address from parameters', async () => {
      brokerDaemonOptions.rpcPass = 'passwd'
      brokerDaemon = new BrokerDaemon(brokerDaemonOptions)
      expect(brokerDaemon.rpcPass).to.be.eql('passwd')
    })
  })
})
