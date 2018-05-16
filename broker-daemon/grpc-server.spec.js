const path = require('path')
const { chai, sinon, rewire } = require('test/test-helper')
const { expect } = chai

const GrpcServer = rewire(path.resolve('broker-daemon', 'grpc-server'))

describe('GrpcServer', () => {
  let grpcServer
  let addService
  let BrokerService
  let brokerService
  let RelayerClient
  let Orderbook
  let pathResolve
  let protoPath

  beforeEach(() => {
    brokerService = {
      definition: 'mydef',
      implementation: 'myimp'
    }
    BrokerService = sinon.stub().returns(brokerService)
    GrpcServer.__set__('BrokerService', BrokerService)

    RelayerClient = sinon.stub()
    GrpcServer.__set__('RelayerClient', RelayerClient)

    addService = sinon.stub()
    grpcServer = sinon.stub().returns({
      addService
    })
    GrpcServer.__set__('grpc', {
      Server: grpcServer
    })

    protoPath = 'mypath'
    pathResolve = sinon.stub().returns(protoPath)
    GrpcServer.__set__('path', {
      resolve: pathResolve
    })

    Orderbook = sinon.stub()
    Orderbook.prototype.initialize = sinon.stub()
    GrpcServer.__set__('Orderbook', Orderbook)
  })

  describe('new', () => {
    it('assigns a logger', () => {
      const logger = 'mylogger'
      const server = new GrpcServer(logger)

      expect(server).to.have.property('logger')
      expect(server.logger).to.be.eql(logger)
    })

    it('assigns a store', () => {
      const store = 'mystore'
      const server = new GrpcServer(null, store)

      expect(server).to.have.property('store')
      expect(server.store).to.be.eql(store)
    })

    it('assigns an eventHandler', () => {
      const eventHandler = 'myevents'
      const server = new GrpcServer(null, null, eventHandler)

      expect(server).to.have.property('eventHandler')
      expect(server.eventHandler).to.be.eql(eventHandler)
    })

    it('assigns the proto path', () => {
      const BROKER_PROTO_PATH = GrpcServer.__get__('BROKER_PROTO_PATH')

      const server = new GrpcServer()

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
      const server = new GrpcServer()

      expect(grpcServer).to.have.been.calledOnce()
      expect(grpcServer).to.have.been.calledWith()
      expect(grpcServer).to.have.been.calledWithNew()
      expect(server).to.have.property('server')
      expect(server.server).to.be.equal(instanceServer)
    })

    it('creates a relayer client', () => {
      const server = new GrpcServer()

      expect(RelayerClient).to.have.been.calledOnce()
      expect(RelayerClient).to.have.been.calledWithNew()
      expect(server).to.have.property('relayer')
      expect(server.relayer).to.be.instanceOf(RelayerClient)
    })

    it('creates a broker service', () => {
      const logger = 'mylogger'
      const store = 'mystore'

      const server = new GrpcServer(logger, store)

      expect(BrokerService).to.have.been.calledOnce()
      expect(BrokerService).to.have.been.calledWith(protoPath, sinon.match({ logger, relayer: sinon.match.instanceOf(RelayerClient) }))
      expect(BrokerService).to.have.been.calledWithNew()
      expect(server).to.have.property('brokerService')
      expect(server.brokerService).to.be.equal(brokerService)
    })

    it('adds the broker service', () => {
      const server = new GrpcServer()

      expect(server).to.have.property('server')
      expect(server.server.addService).to.be.equal(addService)
      expect(addService).to.have.been.calledOnce()
      expect(addService).to.have.been.calledWith(brokerService.definition, brokerService.implementation)
    })

    it('creates an empty orderbooks hash', () => {
      const server = new GrpcServer()

      expect(server).to.have.property('orderbooks')
      expect(server.orderbooks).to.be.eql({})
    })

    it('defines a #listen method', () => {
      const server = new GrpcServer()

      expect(server).to.have.property('listen')
      expect(server.listen).to.be.a('function')
    })
  })

  describe('initializeMarket', () => {
    let store

    beforeEach(() => {
      store = {
        sublevel: sinon.stub()
      }

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

      expect(server.orderbooks).to.have.property(marketName)
      expect(server.orderbooks[marketName]).to.be.instanceOf(Orderbook)
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

      expect(store.sublevel).to.have.been.calledOnce()
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
    let store

    beforeEach(() => {
      store = {
        sublevel: sinon.stub()
      }

      Orderbook.prototype.initialize.resolves()
    })

    it('initializes all markets', async () => {
      const marketNames = ['ABC/XYZ', 'BTC/LTC']
      const server = new GrpcServer(null, store)

      await server.initializeMarkets(marketNames)

      expect(Orderbook).to.have.been.calledTwice()
      expect(Orderbook).to.have.been.calledWith(marketNames[0])
      expect(Orderbook).to.have.been.calledWith(marketNames[1])
      expect(Object.keys(server.orderbooks)).to.have.lengthOf(2)
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
