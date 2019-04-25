const path = require('path')
const { expect, rewire, sinon } = require('test/test-helper')

const OrderService = rewire(path.resolve(__dirname))

describe('OrderService', () => {
  let createBlockOrderStub
  let getBlockOrderStub
  let cancelBlockOrderStub
  let getBlockOrdersStub
  let cancelAllBlockOrdersStub
  let getTradeHistoryStub

  let GrpcMethod
  let register
  let fakeRegistered
  let loadProto
  let proto

  let protoPath
  let logger
  let auth

  let blockOrderWorker

  let server

  beforeEach(() => {
    protoPath = 'fakePath'
    proto = {
      broker: {
        rpc: {
          OrderService: {
            service: 'fakeService'
          },
          CreateBlockOrderResponse: sinon.stub(),
          GetBlockOrderResponse: sinon.stub(),
          GetBlockOrdersResponse: sinon.stub(),
          CancelAllBlockOrdersResponse: sinon.stub(),
          GetTradeHistoryResponse: sinon.stub(),
          TimeInForce: {
            GTC: 0
          }
        }
      }
    }
    logger = {
      info: sinon.stub(),
      error: sinon.stub()
    }
    auth = sinon.stub()

    blockOrderWorker = sinon.stub()
    GrpcMethod = sinon.stub()
    fakeRegistered = sinon.stub()
    register = sinon.stub().returns(fakeRegistered)
    GrpcMethod.prototype.register = register
    OrderService.__set__('GrpcUnaryMethod', GrpcMethod)

    loadProto = sinon.stub().returns(proto)
    OrderService.__set__('loadProto', loadProto)

    createBlockOrderStub = sinon.stub()
    OrderService.__set__('createBlockOrder', createBlockOrderStub)

    getBlockOrderStub = sinon.stub()
    OrderService.__set__('getBlockOrder', getBlockOrderStub)

    cancelBlockOrderStub = sinon.stub()
    OrderService.__set__('cancelBlockOrder', cancelBlockOrderStub)

    getBlockOrdersStub = sinon.stub()
    OrderService.__set__('getBlockOrders', getBlockOrdersStub)

    cancelAllBlockOrdersStub = sinon.stub()
    OrderService.__set__('cancelAllBlockOrders', cancelAllBlockOrdersStub)

    getTradeHistoryStub = sinon.stub()
    OrderService.__set__('getTradeHistory', getTradeHistoryStub)
  })

  beforeEach(() => {
    server = new OrderService(protoPath, { logger, blockOrderWorker, auth })
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
    expect(server.definition).to.be.equal(proto.broker.rpc.OrderService.service)
  })

  it('creates a name', () => {
    expect(server).to.have.property('serviceName')
    expect(server.serviceName).to.be.a('string')
    expect(server.serviceName).to.be.eql('OrderService')
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
      expect(callArgs[1]).to.be.equal('[OrderService:createBlockOrder]')
    })

    describe('request options', () => {
      it('passes in the logger', () => {
        expect(callArgs[2]).to.have.property('logger', logger)
      })

      it('block order worker', () => {
        expect(callArgs[2]).to.have.property('blockOrderWorker', blockOrderWorker)
      })

      it('passes in auth', () => {
        expect(callArgs[2]).to.have.property('auth', auth)
      })
    })

    it('passes in the response', () => {
      expect(callArgs[3]).to.be.an('object')
      expect(callArgs[3]).to.have.property('CreateBlockOrderResponse', proto.broker.rpc.CreateBlockOrderResponse)
    })

    it('passes in the enum', () => {
      expect(callArgs[3]).to.be.an('object')
      expect(callArgs[3]).to.have.property('TimeInForce', proto.broker.rpc.TimeInForce)
    })
  })

  describe('#getBlockOrder', () => {
    let callOrder = 1
    let callArgs

    beforeEach(() => {
      callArgs = GrpcMethod.args[callOrder]
    })

    it('exposes an implementation', () => {
      expect(server.implementation).to.have.property('getBlockOrder')
      expect(server.implementation.getBlockOrder).to.be.a('function')
    })

    it('creates a GrpcMethod', () => {
      expect(GrpcMethod).to.have.been.called()
      expect(GrpcMethod).to.have.been.calledWithNew()
      expect(server.implementation.getBlockOrder).to.be.equal(fakeRegistered)
    })

    it('provides the method', () => {
      expect(callArgs[0]).to.be.equal(getBlockOrderStub)
    })

    it('provides a message id', () => {
      expect(callArgs[1]).to.be.equal('[OrderService:getBlockOrder]')
    })

    describe('request options', () => {
      it('passes in the logger', () => {
        expect(callArgs[2]).to.have.property('logger', logger)
      })

      it('block order worker', () => {
        expect(callArgs[2]).to.have.property('blockOrderWorker', blockOrderWorker)
      })

      it('passes in auth', () => {
        expect(callArgs[2]).to.have.property('auth', auth)
      })
    })

    it('passes in the response', () => {
      expect(callArgs[3]).to.be.an('object')
      expect(callArgs[3]).to.have.property('GetBlockOrderResponse', proto.broker.rpc.GetBlockOrderResponse)
    })
  })

  describe('#cancelBlockOrder', () => {
    let callOrder = 2
    let callArgs

    beforeEach(() => {
      callArgs = GrpcMethod.args[callOrder]
    })

    it('exposes an implementation', () => {
      expect(server.implementation).to.have.property('cancelBlockOrder')
      expect(server.implementation.cancelBlockOrder).to.be.a('function')
    })

    it('creates a GrpcMethod', () => {
      expect(GrpcMethod).to.have.been.called()
      expect(GrpcMethod).to.have.been.calledWithNew()
      expect(server.implementation.cancelBlockOrder).to.be.equal(fakeRegistered)
    })

    it('provides the method', () => {
      expect(callArgs[0]).to.be.equal(cancelBlockOrderStub)
    })

    it('provides a message id', () => {
      expect(callArgs[1]).to.be.equal('[OrderService:cancelBlockOrder]')
    })

    describe('request options', () => {
      it('passes in the logger', () => {
        expect(callArgs[2]).to.have.property('logger', logger)
      })

      it('block order worker', () => {
        expect(callArgs[2]).to.have.property('blockOrderWorker', blockOrderWorker)
      })

      it('passes in auth', () => {
        expect(callArgs[2]).to.have.property('auth', auth)
      })
    })
  })

  describe('#getBlockOrders', () => {
    let callOrder = 3
    let callArgs

    beforeEach(() => {
      callArgs = GrpcMethod.args[callOrder]
    })

    it('exposes an implementation', () => {
      expect(server.implementation).to.have.property('getBlockOrders')
      expect(server.implementation.getBlockOrders).to.be.a('function')
    })

    it('creates a GrpcMethod', () => {
      expect(GrpcMethod).to.have.been.called()
      expect(GrpcMethod).to.have.been.calledWithNew()
      expect(server.implementation.getBlockOrders).to.be.equal(fakeRegistered)
    })

    it('provides the method', () => {
      expect(callArgs[0]).to.be.equal(getBlockOrdersStub)
    })

    it('provides a message id', () => {
      expect(callArgs[1]).to.be.equal('[OrderService:getBlockOrders]')
    })

    describe('request options', () => {
      it('passes in the logger', () => {
        expect(callArgs[2]).to.have.property('logger', logger)
      })

      it('block order worker', () => {
        expect(callArgs[2]).to.have.property('blockOrderWorker', blockOrderWorker)
      })

      it('passes in auth', () => {
        expect(callArgs[2]).to.have.property('auth', auth)
      })
    })

    it('passes in the response', () => {
      expect(callArgs[3]).to.be.an('object')
      expect(callArgs[3]).to.have.property('GetBlockOrdersResponse', proto.broker.rpc.GetBlockOrdersResponse)
    })
  })

  describe('#cancelAllBlockOrders', () => {
    let callOrder = 4
    let callArgs

    beforeEach(() => {
      callArgs = GrpcMethod.args[callOrder]
    })

    it('exposes an implementation', () => {
      expect(server.implementation).to.have.property('cancelAllBlockOrders')
      expect(server.implementation.cancelAllBlockOrders).to.be.a('function')
    })

    it('creates a GrpcMethod', () => {
      expect(GrpcMethod).to.have.been.called()
      expect(GrpcMethod).to.have.been.calledWithNew()
      expect(server.implementation.cancelAllBlockOrders).to.be.equal(fakeRegistered)
    })

    it('provides the method', () => {
      expect(callArgs[0]).to.be.equal(cancelAllBlockOrdersStub)
    })

    it('provides a message id', () => {
      expect(callArgs[1]).to.be.equal('[OrderService:cancelAllBlockOrders]')
    })

    describe('request options', () => {
      it('passes in the logger', () => {
        expect(callArgs[2]).to.have.property('logger', logger)
      })

      it('block order worker', () => {
        expect(callArgs[2]).to.have.property('blockOrderWorker', blockOrderWorker)
      })

      it('passes in auth', () => {
        expect(callArgs[2]).to.have.property('auth', auth)
      })
    })

    it('passes in the response', () => {
      expect(callArgs[3]).to.be.an('object')
      expect(callArgs[3]).to.have.property('CancelAllBlockOrdersResponse', proto.broker.rpc.CancelAllBlockOrdersResponse)
    })
  })

  describe('#getTradeHistory', () => {
    let callOrder = 5
    let callArgs

    beforeEach(() => {
      callArgs = GrpcMethod.args[callOrder]
    })

    it('exposes an implementation', () => {
      expect(server.implementation).to.have.property('getTradeHistory')
      expect(server.implementation.getTradeHistory).to.be.a('function')
    })

    it('creates a GrpcMethod', () => {
      expect(GrpcMethod).to.have.been.called()
      expect(GrpcMethod).to.have.been.calledWithNew()
      expect(server.implementation.getTradeHistory).to.be.equal(fakeRegistered)
    })

    it('provides the method', () => {
      expect(callArgs[0]).to.be.equal(getTradeHistoryStub)
    })

    it('provides a message id', () => {
      expect(callArgs[1]).to.be.equal('[OrderService:getTradeHistory]')
    })

    describe('request options', () => {
      it('passes in the logger', () => {
        expect(callArgs[2]).to.have.property('logger', logger)
      })

      it('block order worker', () => {
        expect(callArgs[2]).to.have.property('blockOrderWorker', blockOrderWorker)
      })

      it('passes in auth', () => {
        expect(callArgs[2]).to.have.property('auth', auth)
      })
    })

    it('passes in the response', () => {
      expect(callArgs[3]).to.be.an('object')
      expect(callArgs[3]).to.have.property('GetTradeHistoryResponse', proto.broker.rpc.GetTradeHistoryResponse)
    })
  })
})
