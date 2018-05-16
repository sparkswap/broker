const path = require('path')
const { chai, rewire, sinon } = require('test/test-helper')

const { expect } = chai

const OrderBookService = rewire(path.resolve(__dirname))

describe('OrderBookService', () => {
  let watchMarketStub

  let GrpcMethod
  let register
  let fakeRegistered
  let loadProto
  let proto

  let protoPath
  let logger

  let relayer

  let server

  beforeEach(() => {
    protoPath = 'fakePath'
    proto = {
      OrderBook: {
        service: 'fakeService'
      },
      WatchMarketResponse: sinon.stub()
    }
    logger = {
      info: sinon.stub(),
      error: sinon.stub()
    }

    relayer = sinon.stub()

    GrpcMethod = sinon.stub()
    fakeRegistered = sinon.stub()
    register = sinon.stub().returns(fakeRegistered)
    GrpcMethod.prototype.register = register
    OrderBookService.__set__('GrpcServerStreamingMethod', GrpcMethod)

    loadProto = sinon.stub().returns(proto)
    OrderBookService.__set__('loadProto', loadProto)

    watchMarketStub = sinon.stub()
    OrderBookService.__set__('watchMarket', watchMarketStub)
  })

  beforeEach(() => {
    server = new OrderBookService(protoPath, { logger, relayer })
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
    expect(server.definition).to.be.equal(proto.OrderBook.service)
  })

  it('creates a name', () => {
    expect(server).to.have.property('serviceName')
    expect(server.serviceName).to.be.a('string')
    expect(server.serviceName).to.be.eql('OrderBook')
  })

  it('exposes an implementation', () => {
    expect(server).to.have.property('implementation')
    expect(server.implementation).to.be.an('object')
  })

  describe('#watchMarket', () => {
    let callOrder = 0
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
      expect(callArgs[1]).to.be.equal('[OrderBook:watchMarket]')
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
})
