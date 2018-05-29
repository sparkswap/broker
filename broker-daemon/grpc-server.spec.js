const path = require('path')
const { expect, sinon, rewire } = require('test/test-helper')

const GrpcServer = rewire(path.resolve('broker-daemon', 'grpc-server'))

describe('GrpcServer', () => {
  let grpcServer
  let addService
  let AdminService
  let adminService
  let OrderService
  let orderService
  let OrderBookService
  let orderBookService
  let WalletService
  let walletService
  let RelayerClient
  let Orderbook
  let BlockOrderWorker
  let pathResolve
  let protoPath
  let LndEngine
  let store

  beforeEach(() => {
    adminService = {
      definition: 'mydef',
      implementation: 'myimp'
    }
    AdminService = sinon.stub().returns(adminService)
    GrpcServer.__set__('AdminService', AdminService)

    orderService = {
      definition: 'mydef',
      implementation: 'myimp'
    }
    OrderService = sinon.stub().returns(orderService)
    GrpcServer.__set__('OrderService', OrderService)

    orderBookService = {
      definition: 'mydef',
      implementation: 'myimp'
    }
    OrderBookService = sinon.stub().returns(orderBookService)
    GrpcServer.__set__('OrderBookService', OrderBookService)

    walletService = {
      definition: 'mydef',
      implementation: 'myimp'
    }
    WalletService = sinon.stub().returns(walletService)
    GrpcServer.__set__('WalletService', WalletService)

    RelayerClient = sinon.stub()
    GrpcServer.__set__('RelayerClient', RelayerClient)

    addService = sinon.stub()
    grpcServer = sinon.stub().returns({
      addService
    })
    GrpcServer.__set__('grpc', {
      Server: grpcServer
    })

    LndEngine = sinon.stub()
    GrpcServer.__set__('LndEngine', LndEngine)

    protoPath = 'mypath'
    pathResolve = sinon.stub().returns(protoPath)
    GrpcServer.__set__('path', {
      resolve: pathResolve
    })

    Orderbook = sinon.stub()
    Orderbook.prototype.initialize = sinon.stub()
    GrpcServer.__set__('Orderbook', Orderbook)

    BlockOrderWorker = sinon.stub()
    GrpcServer.__set__('BlockOrderWorker', BlockOrderWorker)

    store = {
      sublevel: sinon.stub()
    }
  })

  describe('new', () => {
    it('assigns a logger', () => {
      const logger = 'mylogger'
      const server = new GrpcServer(logger, store)

      expect(server).to.have.property('logger')
      expect(server.logger).to.be.eql(logger)
    })

    it('assigns a store', () => {
      const server = new GrpcServer(null, store)

      expect(server).to.have.property('store')
      expect(server.store).to.be.eql(store)
    })

    it('assigns an eventHandler', () => {
      const eventHandler = 'myevents'
      const server = new GrpcServer(null, store, eventHandler)

      expect(server).to.have.property('eventHandler')
      expect(server.eventHandler).to.be.eql(eventHandler)
    })

    it('assigns the proto path', () => {
      const BROKER_PROTO_PATH = GrpcServer.__get__('BROKER_PROTO_PATH')

      const server = new GrpcServer(null, store)

      expect(pathResolve).to.have.been.calledOnce()
      expect(pathResolve).to.have.been.calledWith(BROKER_PROTO_PATH)
      expect(server).to.have.property('protoPath')
      expect(server.protoPath).to.be.eql(protoPath)
    })

    it('creates a grpc server', () => {
      const instanceServer = {
        addService
      }
      grpcServer.returns(instanceServer)
      const server = new GrpcServer(null, store)

      expect(grpcServer).to.have.been.calledOnce()
      expect(grpcServer).to.have.been.calledWith()
      expect(grpcServer).to.have.been.calledWithNew()
      expect(server).to.have.property('server')
      expect(server.server).to.be.equal(instanceServer)
    })

    it('creates a relayer client', () => {
      const server = new GrpcServer(null, store)

      expect(RelayerClient).to.have.been.calledOnce()
      expect(RelayerClient).to.have.been.calledWithNew()
      expect(server).to.have.property('relayer')
      expect(server.relayer).to.be.instanceOf(RelayerClient)
    })

    it('creates a admin service', () => {
      const logger = 'mylogger'

      const server = new GrpcServer(logger, store)

      expect(AdminService).to.have.been.calledOnce()
      expect(AdminService).to.have.been.calledWith(protoPath, sinon.match({ logger, relayer: sinon.match.instanceOf(RelayerClient) }))
      expect(AdminService).to.have.been.calledWithNew()
      expect(server).to.have.property('adminService')
      expect(server.adminService).to.be.equal(adminService)
    })

    it('adds the admin service', () => {
      const server = new GrpcServer(null, store)

      expect(server).to.have.property('server')
      expect(server.server.addService).to.be.equal(addService)
      expect(addService).to.have.been.calledWith(adminService.definition, adminService.implementation)
    })

    it('creates a order service', () => {
      const logger = 'mylogger'

      const server = new GrpcServer(logger, store)

      expect(OrderService).to.have.been.calledOnce()
      expect(OrderService).to.have.been.calledWith(protoPath, sinon.match({ logger, relayer: sinon.match.instanceOf(RelayerClient), orderbooks: sinon.match.instanceOf(Map) }))
      expect(OrderService).to.have.been.calledWithNew()
      expect(server).to.have.property('orderService')
      expect(server.orderService).to.be.equal(orderService)
    })

    it('adds the order service', () => {
      const server = new GrpcServer(null, store)

      expect(server).to.have.property('server')
      expect(server.server.addService).to.be.equal(addService)
      expect(addService).to.have.been.calledWith(orderService.definition, orderService.implementation)
    })

    it('creates a orderBook service', () => {
      const logger = 'mylogger'
      const orderbooks = {}
      const server = new GrpcServer(logger, store)

      expect(OrderBookService).to.have.been.calledOnce()
      expect(OrderBookService).to.have.been.calledWith(protoPath, sinon.match({ logger, relayer: sinon.match.instanceOf(RelayerClient), orderbooks }))
      expect(OrderBookService).to.have.been.calledWithNew()
      expect(server).to.have.property('orderBookService')
      expect(server.orderBookService).to.be.equal(orderBookService)
    })

    it('adds the wallet service', () => {
      const server = new GrpcServer(null, store)

      expect(server).to.have.property('server')
      expect(server.server.addService).to.be.equal(addService)
      expect(addService).to.have.been.calledWith(walletService.definition, walletService.implementation)
    })

    it('creates a wallet service', () => {
      const logger = 'mylogger'

      const server = new GrpcServer(logger, store)

      expect(WalletService).to.have.been.calledOnce()
      expect(WalletService).to.have.been.calledWith(protoPath, sinon.match({ logger, engine: sinon.match.instanceOf(LndEngine) }))
      expect(WalletService).to.have.been.calledWithNew()
      expect(server).to.have.property('walletService')
      expect(server.walletService).to.be.equal(walletService)
    })

    it('adds the orderBook service', () => {
      const server = new GrpcServer(null, store)

      expect(server).to.have.property('server')
      expect(server.server.addService).to.be.equal(addService)
      expect(addService).to.have.been.calledWith(orderBookService.definition, orderBookService.implementation)
    })

    it('creates an empty orderbooks map', () => {
      const server = new GrpcServer(null, store)

      expect(server).to.have.property('orderbooks')
      expect(server.orderbooks).to.be.eql(new Map())
    })

    it('creates a BlockOrderWorker', () => {
      const server = new GrpcServer(null, store)

      expect(BlockOrderWorker).to.have.been.calledOnce()
      expect(BlockOrderWorker).to.have.been.calledWithNew()
    })

    it('creates a sublevel for block orders', () => {
      const fakeBlockOrderSublevel = sinon.stub()
      store.sublevel.withArgs('block-orders').returns(fakeBlockOrderSublevel)
      const server = new GrpcServer(null, store)

      expect(BlockOrderWorker).to.have.been.calledWith(sinon.match({ store: fakeBlockOrderSublevel }))
    })

    it('provides the relayer to the BlockOrderWorker', () => {
      const server = new GrpcServer(null, store)

      expect(BlockOrderWorker).to.have.been.calledWith(sinon.match({ relayer: sinon.match.instanceOf(RelayerClient) }))
    })

    it('provides the engine to the BlockOrderWorker', () => {
      const server = new GrpcServer(null, store)

      expect(BlockOrderWorker).to.have.been.calledWith(sinon.match({ engine: sinon.match.instanceOf(LndEngine) }))
    })

    it('provides the orderbooks to the BlockOrderWorker', () => {
      const server = new GrpcServer(null, store)

      expect(BlockOrderWorker).to.have.been.calledWith(sinon.match({ orderbooks: sinon.match.instanceOf(Map) }))
    })

    it('provides the logger to the BlockOrderWorker', () => {
      const logger = 'mylogger'
      const server = new GrpcServer(logger, store)

      expect(BlockOrderWorker).to.have.been.calledWith(sinon.match({ logger: logger }))
    })

    it('assigns the BlockOrderWorker', () => {
      const server = new GrpcServer(null, store)

      expect(server).to.have.property('blockOrderWorker')
      expect(server.blockOrderWorker).to.be.instanceOf(BlockOrderWorker)
    })

    it('defines a #listen method', () => {
      const server = new GrpcServer(null, store)

      expect(server).to.have.property('listen')
      expect(server.listen).to.be.a('function')
    })
  })

  describe('initializeMarket', () => {
    beforeEach(() => {
      Orderbook.prototype.initialize.resolves()
    })

    it('creates an orderbook for the market', async () => {
      const marketName = 'ABC/XYZ'
      const server = new GrpcServer(null, store)

      await server.initializeMarket(marketName)

      expect(Orderbook).to.have.been.calledOnce()
      expect(Orderbook).to.have.been.calledWithNew()
      expect(Orderbook).to.have.been.calledWith(marketName)
    })

    it('assigns the orderbook to the market hash', async () => {
      const marketName = 'ABC/XYZ'
      const server = new GrpcServer(null, store)

      await server.initializeMarket(marketName)

      expect(server.orderbooks.get(marketName)).to.be.instanceOf(Orderbook)
    })

    it('provides a relayer', async () => {
      const marketName = 'ABC/XYZ'
      const server = new GrpcServer(null, store)

      await server.initializeMarket(marketName)

      expect(Orderbook).to.have.been.calledWith(sinon.match.any, sinon.match.instanceOf(RelayerClient))
    })

    it('creates a sublevel store for the orderbook', async () => {
      const marketName = 'ABC/XYZ'
      const fakeSublevel = 'mysublevel'
      store.sublevel.returns(fakeSublevel)
      const server = new GrpcServer(null, store)

      await server.initializeMarket(marketName)

      expect(store.sublevel).to.have.been.calledWith(marketName)
      expect(Orderbook).to.have.been.calledWith(sinon.match.any, sinon.match.any, fakeSublevel)
    })

    it('provides a logger', async () => {
      const marketName = 'ABC/XYZ'
      const fakeLogger = 'mylogger'
      const server = new GrpcServer(fakeLogger, store)

      await server.initializeMarket(marketName)

      expect(Orderbook).to.have.been.calledWith(sinon.match.any, sinon.match.any, sinon.match.any, fakeLogger)
    })

    it('initializes the market', async () => {
      const marketName = 'ABC/XYZ'
      const server = new GrpcServer(null, store)

      await server.initializeMarket(marketName)

      expect(Orderbook.prototype.initialize).to.have.been.calledOnce()
    })

    // TODO: test this a better way
    it('resolves once the orderbook resolves', () => {
      const marketName = 'ABC/XYZ'
      const server = new GrpcServer(null, store)

      const promise = server.initializeMarket(marketName)

      expect(promise).to.be.a('promise')
    })
  })

  describe('#initializeMarkets', () => {
    beforeEach(() => {
      Orderbook.prototype.initialize.resolves()
    })

    it('initializes all markets', async () => {
      const marketNames = ['ABC/XYZ', 'BTC/LTC']
      const server = new GrpcServer(null, store)

      await server.initializeMarkets(marketNames)

      expect(Orderbook).to.have.been.calledTwice()
      expect(Orderbook).to.have.been.calledWith(marketNames[0])
      expect(Orderbook).to.have.been.calledWith(marketNames[1])
      expect(server.orderbooks.size).to.be.equal(2)
    })

    // TODO: test this a better way
    it('resolves once all orderbooks have resolved', () => {
      const marketName = 'ABC/XYZ'
      const server = new GrpcServer(null, store)

      const promise = server.initializeMarkets([marketName])

      expect(promise).to.be.a('promise')
    })
  })

  describe.skip('#listen')
})
