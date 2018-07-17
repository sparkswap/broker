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
  let engine
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

    addService = sinon.stub()
    rpcServer = sinon.stub().returns({
      addService
    })
    BrokerRPCServer.__set__('grpc', {
      Server: rpcServer
    })

    engine = sinon.stub()
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

    xit('assigns an engine')

    xit('assigns a relayer')

    xit('assigns a block order worker')

    xit('assigns orderbooks')

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

      const server = new BrokerRPCServer({ logger, relayer, engine, engines })

      expect(AdminService).to.have.been.calledOnce()
      expect(AdminService).to.have.been.calledWith(protoPath, sinon.match({ logger, relayer, engine, engines }))
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

  describe.skip('#listen')
})
