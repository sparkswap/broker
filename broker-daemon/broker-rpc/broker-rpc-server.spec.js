const path = require('path')
const { expect, sinon, rewire } = require('test/test-helper')

const BrokerRPCServer = rewire(path.resolve(__dirname, 'broker-rpc-server'))

describe('BrokerRPCServer', () => {
  let rpcServer
  let addService
  let AdminService
  let adminService
  let OrderService
  let orderService
  let OrderBookService
  let orderBookService
  let WalletService
  let walletService
  let pathResolve
  let protoPath
  let engines
  let httpServer
  let grpcGateway
  let router
  let httpServerStub

  beforeEach(() => {
    adminService = {
      definition: 'mydef',
      implementation: 'myimp'
    }
    AdminService = sinon.stub().returns(adminService)
    BrokerRPCServer.__set__('AdminService', AdminService)

    orderService = {
      definition: 'mydef',
      implementation: 'myimp'
    }
    OrderService = sinon.stub().returns(orderService)
    BrokerRPCServer.__set__('OrderService', OrderService)

    orderBookService = {
      definition: 'mydef',
      implementation: 'myimp'
    }
    OrderBookService = sinon.stub().returns(orderBookService)
    BrokerRPCServer.__set__('OrderBookService', OrderBookService)

    walletService = {
      definition: 'mydef',
      implementation: 'myimp'
    }
    WalletService = sinon.stub().returns(walletService)
    BrokerRPCServer.__set__('WalletService', WalletService)

    addService = sinon.stub()
    rpcServer = sinon.stub().returns({
      addService
    })
    BrokerRPCServer.__set__('grpc', {
      Server: rpcServer
    })

    router = function router (req, res, next) {
      router.handle(req, res, next)
    }
    httpServerStub = { listen: sinon.stub() }
    httpServer = sinon.stub().returns(httpServerStub)
    grpcGateway = sinon.stub().returns(router)
    BrokerRPCServer.__set__('grpcGateway', grpcGateway)
    BrokerRPCServer.__set__('createHttpServer', httpServer)

    engines = new Map()

    protoPath = 'mypath'
    pathResolve = sinon.stub().returns(protoPath)
    BrokerRPCServer.__set__('path', {
      resolve: pathResolve
    })
  })

  describe('new', () => {
    it('assigns a logger', () => {
      const logger = 'mylogger'
      const server = new BrokerRPCServer({ logger })

      expect(server).to.have.property('logger')
      expect(server.logger).to.be.eql(logger)
    })

    it('assigns an engine', () => {
      const server = new BrokerRPCServer({ engines })
      expect(server.engines).to.be.eql(engines)
    })

    it('assigns a relayer', () => {
      const relayer = 'Relayer'
      const server = new BrokerRPCServer({ relayer })
      expect(server.relayer).to.be.eql(relayer)
    })

    it('assigns a block order worker', () => {
      const blockOrderWorker = 'BlockOrderWorker'
      const server = new BrokerRPCServer({ blockOrderWorker })
      expect(server.blockOrderWorker).to.be.eql(blockOrderWorker)
    })

    it('assigns orderbooks', () => {
      const orderbooks = { 'BTC/LTC': [] }
      const server = new BrokerRPCServer({ orderbooks })
      expect(server.orderbooks).to.be.eql(orderbooks)
    })

    it('assigns the proto path', () => {
      const BROKER_PROTO_PATH = BrokerRPCServer.__get__('BROKER_PROTO_PATH')

      const server = new BrokerRPCServer()

      expect(pathResolve).to.have.been.calledOnce()
      expect(pathResolve).to.have.been.calledWith(BROKER_PROTO_PATH)
      expect(server).to.have.property('protoPath')
      expect(server.protoPath).to.be.eql(protoPath)
    })

    it('creates a grpc server', () => {
      const instanceServer = {
        addService
      }
      rpcServer.returns(instanceServer)
      const server = new BrokerRPCServer()
      const serverOptions = BrokerRPCServer.__get__('GRPC_SERVER_OPTIONS')

      expect(rpcServer).to.have.been.calledOnce()
      expect(rpcServer).to.have.been.calledWithExactly(serverOptions)
      expect(rpcServer).to.have.been.calledWithNew()
      expect(server).to.have.property('server')
      expect(server.server).to.be.equal(instanceServer)
    })

    it('creates an http server', () => {
      const rpcAddress = '0.0.0.0:27492'
      const rpcHttpProxyAddress = '0.0.0.0:27592'
      const server = new BrokerRPCServer({ rpcAddress, rpcHttpProxyAddress })
      expect(rpcServer).to.have.been.calledOnce()
      expect(rpcServer).to.have.been.calledWithNew()
      expect(server).to.have.property('httpServer')
      expect(httpServer).to.have.been.calledWith(server.protoPath, rpcAddress, sinon.match.object)
      expect(server.httpServer).to.be.equal(httpServerStub)
    })

    it('passes through http server options', () => {
      const rpcAddress = '0.0.0.0:27492'
      const rpcHttpProxyAddress = '0.0.0.0:27592'
      const disableAuth = true
      const enableCors = true
      const isCertSelfSigned = false
      const privKeyPath = '/fake/privpath'
      const pubKeyPath = '/fake/pubpath'
      const httpMethods = ['/fake/method']
      const logger = { fake: 'logger' }

      // eslint-disable-next-line
      new BrokerRPCServer({
        rpcAddress,
        rpcHttpProxyAddress,
        disableAuth,
        enableCors,
        isCertSelfSigned,
        privKeyPath,
        pubKeyPath,
        rpcHttpProxyMethods: httpMethods,
        logger
      })

      expect(httpServer).to.have.been.calledWith(sinon.match.any, sinon.match.any, {
        disableAuth,
        isCertSelfSigned,
        enableCors,
        privKeyPath,
        pubKeyPath,
        httpMethods,
        logger
      })
    })

    it('creates a admin service', () => {
      const logger = 'mylogger'
      const relayer = 'myrelayer'

      const server = new BrokerRPCServer({ logger, relayer, engines })

      expect(AdminService).to.have.been.calledOnce()
      expect(AdminService).to.have.been.calledWith(protoPath, sinon.match({ logger, relayer, engines }))
      expect(AdminService).to.have.been.calledWithNew()
      expect(server).to.have.property('adminService')
      expect(server.adminService).to.be.equal(adminService)
    })

    it('adds the admin service', () => {
      const server = new BrokerRPCServer()

      expect(server).to.have.property('server')
      expect(server.server.addService).to.be.equal(addService)
      expect(addService).to.have.been.calledWith(adminService.definition, adminService.implementation)
    })

    it('creates a order service', () => {
      const logger = 'mylogger'
      const blockOrderWorker = 'myblockworker'

      const server = new BrokerRPCServer({ logger, blockOrderWorker })

      expect(OrderService).to.have.been.calledOnce()
      expect(OrderService).to.have.been.calledWith(protoPath, sinon.match({ logger, blockOrderWorker }))
      expect(OrderService).to.have.been.calledWithNew()
      expect(server).to.have.property('orderService')
      expect(server.orderService).to.be.equal(orderService)
    })

    it('adds the order service', () => {
      const server = new BrokerRPCServer()

      expect(server).to.have.property('server')
      expect(server.server.addService).to.be.equal(addService)
      expect(addService).to.have.been.calledWith(orderService.definition, orderService.implementation)
    })

    it('creates a orderBook service', () => {
      const logger = 'mylogger'
      const relayer = 'myrelayer'
      const orderbooks = 'myorderbooks'
      const server = new BrokerRPCServer({ logger, relayer, orderbooks })

      expect(OrderBookService).to.have.been.calledOnce()
      expect(OrderBookService).to.have.been.calledWith(protoPath, sinon.match({ logger, relayer, orderbooks }))
      expect(OrderBookService).to.have.been.calledWithNew()
      expect(server).to.have.property('orderBookService')
      expect(server.orderBookService).to.be.equal(orderBookService)
    })

    it('adds the wallet service', () => {
      const server = new BrokerRPCServer()

      expect(server).to.have.property('server')
      expect(server.server.addService).to.be.equal(addService)
      expect(addService).to.have.been.calledWith(walletService.definition, walletService.implementation)
    })

    it('creates a wallet service', () => {
      const logger = 'mylogger'
      const engines = 'myengines'
      const blockOrderWorker = 'myblockworker'

      const server = new BrokerRPCServer({ logger, engines, blockOrderWorker })

      expect(WalletService).to.have.been.calledOnce()
      expect(WalletService).to.have.been.calledWith(protoPath, sinon.match({ logger, engines, blockOrderWorker }))
      expect(WalletService).to.have.been.calledWithNew()
      expect(server).to.have.property('walletService')
      expect(server.walletService).to.be.equal(walletService)
    })

    it('adds the orderBook service', () => {
      const server = new BrokerRPCServer()

      expect(server).to.have.property('server')
      expect(server.server.addService).to.be.equal(addService)
      expect(addService).to.have.been.calledWith(orderBookService.definition, orderBookService.implementation)
    })

    it('defines a #listen method', () => {
      const server = new BrokerRPCServer()

      expect(server).to.have.property('listen')
      expect(server.listen).to.be.a('function')
    })
  })

  describe('#listen', () => {
    let host
    let server
    let credentialStub
    let credentials
    let serverStub
    let bindStub

    beforeEach(() => {
      host = '127.0.0.1:27492'
      credentials = 'credentials'
      credentialStub = sinon.stub().returns(credentials)
      serverStub = sinon.stub()
      bindStub = sinon.stub()

      server = new BrokerRPCServer({
        rpcHttpProxyAddress: '0.0.0.0:27592'
      })
      server.createCredentials = credentialStub
      server.server = {
        bind: bindStub,
        start: serverStub
      }
      server.httpServer = { listen: sinon.stub() }
    })

    beforeEach(() => {
      server.listen(host)
    })

    it('creates server credentials', () => {
      expect(credentialStub).to.have.been.calledOnce()
    })

    it('starts a server at a specified host', () => {
      expect(bindStub).to.have.been.calledWith(host, credentials)
    })

    it('starts a server', () => {
      expect(serverStub).to.have.been.calledOnce()
    })

    it('starts a http server', () => {
      expect(server.httpServer.listen).to.have.been.calledOnce()
    })

    it('throws an error if disableAuth is true and the server is in production', () => {
      const revert = BrokerRPCServer.__set__('IS_PRODUCTION', true)
      server.disableAuth = true
      expect(() => server.listen(host)).to.throw('Cannot disable TLS in production')
      revert()
    })
  })

  describe('#createCredentials', () => {
    let insecureCredStub
    let sslStub
    let server
    let loggerWarnStub
    let fileSyncStub
    let privKeyPath
    let pubKeyPath

    beforeEach(() => {
      insecureCredStub = sinon.stub()
      sslStub = sinon.stub()
      loggerWarnStub = sinon.stub()
      fileSyncStub = sinon.stub()
      privKeyPath = 'privatekey'
      pubKeyPath = 'publickey'

      const logger = {
        warn: loggerWarnStub,
        debug: sinon.stub()
      }

      server = new BrokerRPCServer({ logger, privKeyPath, pubKeyPath })

      BrokerRPCServer.__set__('grpc', {
        ServerCredentials: {
          createInsecure: insecureCredStub,
          createSsl: sslStub
        }
      })
      BrokerRPCServer.__set__('readFileSync', fileSyncStub)
    })

    it('returns insecure credentials if disableAuth is true', () => {
      server.disableAuth = true
      server.createCredentials()
      expect(insecureCredStub).to.have.been.called()
    })

    it('warns the user if disableAuth is true', () => {
      server.disableAuth = true
      server.createCredentials()
      expect(loggerWarnStub).to.have.been.calledWith(sinon.match('DISABLE_AUTH is set to TRUE'))
    })

    it('reads a private key path for ssl generation', () => {
      server.createCredentials()
      expect(fileSyncStub).to.have.been.calledWith(privKeyPath)
    })

    it('reads a public key path for ssl generation', () => {
      server.createCredentials()
      expect(fileSyncStub).to.have.been.calledWith(pubKeyPath)
    })

    it('creates ssl credentials', () => {
      server.createCredentials()
      expect(sslStub).to.have.been.calledOnce()
    })
  })
})
