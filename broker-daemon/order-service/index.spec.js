const path = require('path')
const { expect, rewire, sinon } = require('test/test-helper')

const OrderService = rewire(path.resolve(__dirname))

describe('OrderService', () => {
  let createBlockOrderStub

  let GrpcMethod
  let register
  let fakeRegistered
  let loadProto
  let proto

  let protoPath
  let logger

  let relayer
  let orderbooks

  let server

  beforeEach(() => {
    protoPath = 'fakePath'
    proto = {
      Order: {
        service: 'fakeService'
      },
      CreateOrderResponse: sinon.stub(),
      TimeInForce: {
        GTC: 0
      }
    }
    logger = {
      info: sinon.stub(),
      error: sinon.stub()
    }

    relayer = sinon.stub()
    orderbooks = sinon.stub()

    GrpcMethod = sinon.stub()
    fakeRegistered = sinon.stub()
    register = sinon.stub().returns(fakeRegistered)
    GrpcMethod.prototype.register = register
    OrderService.__set__('GrpcUnaryMethod', GrpcMethod)

    loadProto = sinon.stub().returns(proto)
    OrderService.__set__('loadProto', loadProto)

    createBlockOrderStub = sinon.stub()
    OrderService.__set__('createBlockOrder', createBlockOrderStub)
  })

  beforeEach(() => {
    server = new OrderService(protoPath, { logger, relayer, orderbooks })
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
    expect(server.definition).to.be.equal(proto.Order.service)
  })

  it('creates a name', () => {
    expect(server).to.have.property('serviceName')
    expect(server.serviceName).to.be.a('string')
    expect(server.serviceName).to.be.eql('Order')
  })

  it('exposes an implementation', () => {
    expect(server).to.have.property('implementation')
    expect(server.implementation).to.be.an('object')
  })

  describe('#createBlockOrder', () => {
    let callOrder = 0
    let callArgs

    beforeEach(() => {
      callArgs = GrpcMethod.args[callOrder]
    })

    it('exposes an implementation', () => {
      expect(server.implementation).to.have.property('createBlockOrder')
      expect(server.implementation.createBlockOrder).to.be.a('function')
    })

    it('creates a GrpcMethod', () => {
      expect(GrpcMethod).to.have.been.called()
      expect(GrpcMethod).to.have.been.calledWithNew()
      expect(server.implementation.createBlockOrder).to.be.equal(fakeRegistered)
    })

    it('provides the method', () => {
      expect(callArgs[0]).to.be.equal(createBlockOrderStub)
    })

    it('provides a message id', () => {
      expect(callArgs[1]).to.be.equal('[Order:createBlockOrder]')
    })

    describe('request options', () => {
      it('passes in the logger', () => {
        expect(callArgs[2]).to.have.property('logger', logger)
      })

      it('relayer', () => {
        expect(callArgs[2]).to.have.property('relayer', relayer)
      })

      it('orderbooks', () => {
        expect(callArgs[2]).to.have.property('orderbooks', orderbooks)
      })
    })

    it('passes in the response', () => {
      expect(callArgs[3]).to.be.an('object')
      expect(callArgs[3]).to.have.property('CreateOrderResponse', proto.CreateOrderResponse)
    })

    it('passes in the enum', () => {
      expect(callArgs[3]).to.be.an('object')
      expect(callArgs[3]).to.have.property('TimeInForce', proto.TimeInForce)
    })
  })
})
