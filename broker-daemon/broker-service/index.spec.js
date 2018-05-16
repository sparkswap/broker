const path = require('path')
const { chai, rewire, sinon } = require('test/test-helper')

const { expect } = chai

const BrokerService = rewire(path.resolve(__dirname))

describe('BrokerService', () => {
  let createOrderStub
  let watchMarketStub
  let healthCheckStub

  let GrpcMethod
  let register
  let fakeRegistered
  let loadProto
  let proto

  let protoPath
  let logger

  let eventHandler
  let relayer

  let server

  beforeEach(() => {
    protoPath = 'fakePath'
    proto = {
      Broker: {
        service: 'fakeService'
      },
      CreateOrderResponse: sinon.stub(),
      WatchMarketResponse: sinon.stub(),
      HealthCheckResponse: sinon.stub()
    }
    logger = {
      info: sinon.stub(),
      error: sinon.stub()
    }

    eventHandler = sinon.stub()
    relayer = sinon.stub()

    GrpcMethod = sinon.stub()
    fakeRegistered = sinon.stub()
    register = sinon.stub().returns(fakeRegistered)
    GrpcMethod.prototype.register = register
    BrokerService.__set__('GrpcUnaryMethod', GrpcMethod)
    BrokerService.__set__('GrpcServerStreamingMethod', GrpcMethod)

    loadProto = sinon.stub().returns(proto)
    BrokerService.__set__('loadProto', loadProto)

    createOrderStub = sinon.stub()
    BrokerService.__set__('createOrder', createOrderStub)
    watchMarketStub = sinon.stub()
    BrokerService.__set__('watchMarket', watchMarketStub)
    healthCheckStub = sinon.stub()
    BrokerService.__set__('healthCheck', healthCheckStub)
  })

  beforeEach(() => {
    server = new BrokerService(protoPath, { logger, eventHandler, relayer })
  })

  it('assigns a proto path', () => {
    expect(server).to.have.property('protoPath')
    expect(server.protoPath).to.be.equal(protoPath)
  })

  it('loads the proto', () => {
    expect(loadProto).to.have.been.calledOnce()
    expect(loadProto).to.have.been.calledWith(protoPath)
  })

  it('assigns the proto', () => {
    expect(server).to.have.property('proto')
    expect(server.proto).to.be.equal(proto)
  })

  it('assigns a logger', () => {
    expect(server).to.have.property('logger')
    expect(server.logger).to.be.equal(logger)
  })

  it('assigns the definition', () => {
    expect(server).to.have.property('definition')
    expect(server.definition).to.be.equal(proto.Broker.service)
  })

  it('creates a name', () => {
    expect(server).to.have.property('serviceName')
    expect(server.serviceName).to.be.a('string')
    expect(server.serviceName).to.be.eql('Broker')
  })

  it('exposes an implementation', () => {
    expect(server).to.have.property('implementation')
    expect(server.implementation).to.be.an('object')
  })

  describe('#createOrder', () => {
    let callOrder = 0
    let callArgs

    beforeEach(() => {
      callArgs = GrpcMethod.args[callOrder]
    })

    it('exposes an implementation', () => {
      expect(server.implementation).to.have.property('createOrder')
      expect(server.implementation.createOrder).to.be.a('function')
    })

    it('creates a GrpcMethod', () => {
      expect(GrpcMethod).to.have.been.called()
      expect(GrpcMethod).to.have.been.calledWithNew()
      expect(server.implementation.createOrder).to.be.equal(fakeRegistered)
    })

    it('provides the method', () => {
      expect(callArgs[0]).to.be.equal(createOrderStub)
    })

    it('provides a message id', () => {
      expect(callArgs[1]).to.be.equal('[Broker:createOrder]')
    })

    describe('request options', () => {
      it('passes in the logger', () => {
        expect(callArgs[2]).to.have.property('logger')
        expect(callArgs[2].logger).to.be.equal(logger)
      })

      it('relayer', () => {
        expect(callArgs[2]).to.have.property('relayer')
        expect(callArgs[2].relayer).to.be.equal(relayer)
      })
    })

    it('passes in the response', () => {
      expect(callArgs[3]).to.be.eql({ CreateOrderResponse: proto.CreateOrderResponse })
    })
  })

  describe('#watchMarket', () => {
    let callOrder = 1
    let callArgs

    beforeEach(() => {
      callArgs = GrpcMethod.args[callOrder]
    })

    it('exposes an implementation', () => {
      expect(server.implementation).to.have.property('watchMarket')
      expect(server.implementation.watchMarket).to.be.a('function')
    })

    it('creates a GrpcMethod', () => {
      expect(GrpcMethod).to.have.been.called()
      expect(GrpcMethod).to.have.been.calledWithNew()
      expect(server.implementation.watchMarket).to.be.equal(fakeRegistered)
    })

    it('provides the method', () => {
      expect(callArgs[0]).to.be.equal(watchMarketStub)
    })

    it('provides a message id', () => {
      expect(callArgs[1]).to.be.equal('[Broker:watchMarket]')
    })

    describe('request options', () => {
      it('passes in the logger', () => {
        expect(callArgs[2]).to.have.property('logger')
        expect(callArgs[2].logger).to.be.equal(logger)
      })

      it('relayer', () => {
        expect(callArgs[2]).to.have.property('relayer')
        expect(callArgs[2].relayer).to.be.equal(relayer)
      })
    })

    it('passes in the response', () => {
      expect(callArgs[3]).to.be.eql({ WatchMarketResponse: proto.WatchMarketResponse })
    })
  })

  describe('#healthCheck', () => {
    let callOrder = 2
    let callArgs

    beforeEach(() => {
      callArgs = GrpcMethod.args[callOrder]
    })

    it('exposes an implementation', () => {
      expect(server.implementation).to.have.property('healthCheck')
      expect(server.implementation.healthCheck).to.be.a('function')
    })

    it('creates a GrpcMethod', () => {
      expect(GrpcMethod).to.have.been.called()
      expect(GrpcMethod).to.have.been.calledWithNew()
      expect(server.implementation.healthCheck).to.be.equal(fakeRegistered)
    })

    it('provides the method', () => {
      expect(callArgs[0]).to.be.equal(healthCheckStub)
    })

    it('provides a message id', () => {
      expect(callArgs[1]).to.be.equal('[Broker:healthCheck]')
    })

    describe('request options', () => {
      it('passes in the logger', () => {
        expect(callArgs[2]).to.have.property('logger')
        expect(callArgs[2].logger).to.be.equal(logger)
      })

      it('relayer', () => {
        expect(callArgs[2]).to.have.property('relayer')
        expect(callArgs[2].relayer).to.be.equal(relayer)
      })
    })

    it('passes in the response', () => {
      expect(callArgs[3]).to.be.eql({ HealthCheckResponse: proto.HealthCheckResponse })
    })
  })
})
