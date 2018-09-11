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
  let InfoService
  let infoService
  let pathResolve
  let protoPath
  let engines

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

    infoService = {
      definition: 'mydef',
      implementation: 'myimp'
    }
    InfoService = sinon.stub().returns(infoService)
    BrokerRPCServer.__set__('InfoService', InfoService)

    addService = sinon.stub()
    rpcServer = sinon.stub().returns({
      addService
    })
    BrokerRPCServer.__set__('grpc', {
      Server: rpcServer
    })

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

      expect(rpcServer).to.have.been.calledOnce()
      expect(rpcServer).to.have.been.calledWith()
      expect(rpcServer).to.have.been.calledWithNew()
      expect(server).to.have.property('server')
      expect(server.server).to.be.equal(instanceServer)
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

      const server = new BrokerRPCServer({ logger, engines })

      expect(WalletService).to.have.been.calledOnce()
      expect(WalletService).to.have.been.calledWith(protoPath, sinon.match({ logger, engines }))
      expect(WalletService).to.have.been.calledWithNew()
      expect(server).to.have.property('walletService')
      expect(server.walletService).to.be.equal(walletService)
    })

    it('adds the info service', () => {
      const server = new BrokerRPCServer()

      expect(server).to.have.property('server')
      expect(server.server.addService).to.be.equal(addService)
      expect(addService).to.have.been.calledWith(infoService.definition, infoService.implementation)
    })

    it('creates a info service', () => {
      const logger = 'mylogger'
      const engines = 'myengines'

      const server = new BrokerRPCServer({ logger, engines })

      expect(InfoService).to.have.been.calledOnce()
      expect(InfoService).to.have.been.calledWith(protoPath, sinon.match({ logger, engines }))
      expect(InfoService).to.have.been.calledWithNew()
      expect(server).to.have.property('infoService')
      expect(server.infoService).to.be.equal(infoService)
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

      server = new BrokerRPCServer()
      server.createCredentials = credentialStub
      server.server = {
        bind: bindStub,
        start: serverStub
      }
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

    it('throws an error if disableAuth is true and the server is in production', () => {
      const revert = BrokerRPCServer.__set__('IS_PRODUCTION', true)
      server.disableAuth = true
      expect(() => server.createCredentials()).to.throw('Cannot disable SSL in production')
      revert()
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
