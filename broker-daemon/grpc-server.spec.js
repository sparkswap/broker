const path = require('path')
const { chai, sinon, rewire } = require('test/test-helper')
const { expect } = chai

const GrpcServer = rewire(path.resolve('broker-daemon', 'grpc-server'))

describe('GrpcServer', () => {
  let GrpcAction
  let loadProto
  let grpcServer
  let addService
  let createOrder
  let createOrderBind
  let healthCheck
  let healthCheckBind
  let watchMarket
  let watchMarketBind
  let RelayerClient
  let Orderbook

  beforeEach(() => {
    GrpcAction = sinon.stub()
    GrpcServer.__set__('GrpcAction', GrpcAction)

    loadProto = sinon.stub().returns({
      Broker: {
        service: 'broker-service'
      }
    })
    GrpcServer.__set__('loadProto', loadProto)

    RelayerClient = sinon.stub()
    GrpcServer.__set__('RelayerClient', RelayerClient)

    addService = sinon.stub()
    grpcServer = sinon.stub().returns({
      addService
    })
    GrpcServer.__set__('grpc', {
      Server: grpcServer
    })

    createOrderBind = sinon.stub()
    createOrder = {
      bind: createOrderBind
    }
    GrpcServer.__set__('createOrder', createOrder)

    healthCheckBind = sinon.stub()
    healthCheck = {
      bind: healthCheckBind
    }
    GrpcServer.__set__('healthCheck', healthCheck)

    watchMarketBind = sinon.stub()
    watchMarket = {
      bind: watchMarketBind
    }
    GrpcServer.__set__('watchMarket', watchMarket)

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
      const protoPath = GrpcServer.__get__('BROKER_PROTO_PATH')

      const server = new GrpcServer()

      expect(server).to.have.property('protoPath')
      expect(server.protoPath).to.be.eql(protoPath)
    })

    it('loads the proto', () => {
      const protoPath = GrpcServer.__get__('BROKER_PROTO_PATH')
      const fakeProto = {
        Broker: {
          service: 'broker-service'
        }
      }
      loadProto.returns(fakeProto)

      const server = new GrpcServer()

      expect(loadProto).to.have.been.calledOnce()
      expect(loadProto).to.have.been.calledWith(protoPath)
      expect(server).to.have.property('proto')
      expect(server.proto).to.be.equal(fakeProto)
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

    it('creates a grpc action', () => {
      const fakeAction = {}
      GrpcAction.returns(fakeAction)

      const logger = 'mylogger'
      const store = 'mystore'

      const server = new GrpcServer(logger, store)

      expect(GrpcAction).to.have.been.calledOnce()
      expect(GrpcAction).to.have.been.calledWith(logger, store)
      expect(GrpcAction).to.have.been.calledWithNew()
      expect(server).to.have.property('action')
      expect(server.action).to.be.equal(fakeAction)
    })

    it('stores the broker service', () => {
      const brokerService = 'broker-service'
      loadProto.returns({
        Broker: {
          service: brokerService
        }
      })

      const server = new GrpcServer()

      expect(server).to.have.property('brokerService')
      expect(server.brokerService).to.be.equal(brokerService)
    })

    it('adds the broker service', () => {
      const brokerService = 'broker-service'
      loadProto.returns({
        Broker: {
          service: brokerService
        }
      })

      const server = new GrpcServer()

      expect(server).to.have.property('server')
      expect(server.server.addService).to.be.equal(addService)
      expect(addService).to.have.been.calledOnce()
      expect(addService).to.have.been.calledWith(brokerService)
    })

    it('adds the create order action', () => {
      const brokerService = 'broker-service'
      loadProto.returns({
        Broker: {
          service: brokerService
        }
      })

      let fakeAction = {}
      GrpcAction.returns(fakeAction)

      let fakeBound = function () {}
      createOrderBind.returns(fakeBound)

      const server = new GrpcServer()

      expect(server).to.have.property('server')
      expect(server.server.addService).to.be.equal(addService)
      expect(createOrderBind).to.have.been.calledOnce()
      expect(createOrderBind).to.have.been.calledWith(fakeAction)
      expect(addService).to.have.been.calledWith(brokerService, sinon.match({
        createOrder: fakeBound
      }))
    })

    it('adds the watch market action', () => {
      const brokerService = 'broker-service'
      loadProto.returns({
        Broker: {
          service: brokerService
        }
      })

      let fakeAction = {}
      GrpcAction.returns(fakeAction)

      let fakeBound = function () {}
      watchMarketBind.returns(fakeBound)

      const server = new GrpcServer()

      expect(server).to.have.property('server')
      expect(server.server.addService).to.be.equal(addService)
      expect(watchMarketBind).to.have.been.calledOnce()
      expect(watchMarketBind).to.have.been.calledWith(fakeAction)
      expect(addService).to.have.been.calledWith(brokerService, sinon.match({
        watchMarket: fakeBound
      }))
    })

    it('adds the health check action', () => {
      const brokerService = 'broker-service'
      loadProto.returns({
        Broker: {
          service: brokerService
        }
      })

      let fakeAction = {}
      GrpcAction.returns(fakeAction)

      let fakeBound = function () {}
      healthCheckBind.returns(fakeBound)

      const server = new GrpcServer()

      expect(server).to.have.property('server')
      expect(server.server.addService).to.be.equal(addService)
      expect(healthCheckBind).to.have.been.calledOnce()
      expect(healthCheckBind).to.have.been.calledWith(fakeAction)
      expect(addService).to.have.been.calledWith(brokerService, sinon.match({
        healthCheck: fakeBound
      }))
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
