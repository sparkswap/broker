const path = require('path')
const { expect, rewire, sinon } = require('test/test-helper')

const OrderBookService = rewire(path.resolve(__dirname))

describe('OrderBookService', () => {
  let watchMarketStub
  let getOrderbookStub
  let getSupportedMarketsStub
  let getMarketStatsStub
  let getTradesStub

  let GrpcMethod
  let register
  let fakeRegistered
  let loadProto
  let proto

  let protoPath
  let logger
  let auth

  let relayer
  let orderbooks
  let server
  let EventType

  beforeEach(() => {
    protoPath = 'fakePath'
    EventType = sinon.stub()
    proto = {
      broker: {
        rpc: {
          OrderBookService: {
            service: 'fakeService'
          },
          WatchMarketResponse: {
            EventType
          }
        }
      }
    }
    logger = {
      info: sinon.stub(),
      error: sinon.stub()
    }
    auth = sinon.stub()

    relayer = sinon.stub()

    orderbooks = sinon.stub()

    GrpcMethod = sinon.stub()
    fakeRegistered = sinon.stub()
    register = sinon.stub().returns(fakeRegistered)
    GrpcMethod.prototype.register = register
    OrderBookService.__set__('GrpcServerStreamingMethod', GrpcMethod)
    OrderBookService.__set__('GrpcUnaryMethod', GrpcMethod)

    loadProto = sinon.stub().returns(proto)
    OrderBookService.__set__('loadProto', loadProto)

    watchMarketStub = sinon.stub()
    OrderBookService.__set__('watchMarket', watchMarketStub)

    getOrderbookStub = sinon.stub()
    OrderBookService.__set__('getOrderbook', getOrderbookStub)

    getSupportedMarketsStub = sinon.stub()
    OrderBookService.__set__('getSupportedMarkets', getSupportedMarketsStub)

    getMarketStatsStub = sinon.stub()
    OrderBookService.__set__('getMarketStats', getMarketStatsStub)

    getTradesStub = sinon.stub()
    OrderBookService.__set__('getTrades', getTradesStub)
  })

  beforeEach(() => {
    server = new OrderBookService(protoPath, { logger, relayer, orderbooks, auth })
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
    expect(server.definition).to.be.equal(proto.broker.rpc.OrderBookService.service)
  })

  it('creates a name', () => {
    expect(server).to.have.property('serviceName')
    expect(server.serviceName).to.be.a('string')
    expect(server.serviceName).to.be.eql('OrderBookService')
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
      expect(callArgs[1]).to.be.equal('[OrderBookService:watchMarket]')
    })

    describe('request options', () => {
      it('passes in the logger', () => {
        expect(callArgs[2]).to.have.property('logger', logger)
      })

      it('relayer', () => {
        expect(callArgs[2]).to.have.property('relayer', relayer)
      })

      it('passes in the orderbooks', () => {
        expect(callArgs[2]).to.have.property('orderbooks', orderbooks)
      })

      it('passes in auth', () => {
        expect(callArgs[2]).to.have.property('auth', auth)
      })
    })

    it('passes in the response', () => {
      expect(callArgs[3]).to.be.eql({ EventType })
    })
  })

  describe('#getOrderbook', () => {
    let callOrder = 1
    let callArgs

    beforeEach(() => {
      callArgs = GrpcMethod.args[callOrder]
    })

    it('exposes an implementation', () => {
      expect(server.implementation).to.have.property('getOrderbook')
      expect(server.implementation.getOrderbook).to.be.a('function')
    })

    it('creates a GrpcMethod', () => {
      expect(GrpcMethod).to.have.been.called()
      expect(GrpcMethod).to.have.been.calledWithNew()
      expect(server.implementation.getOrderbook).to.be.equal(fakeRegistered)
    })

    it('provides the method', () => {
      expect(callArgs[0]).to.be.equal(getOrderbookStub)
    })

    it('provides a message id', () => {
      expect(callArgs[1]).to.be.equal('[OrderBookService:getOrderbook]')
    })

    describe('request options', () => {
      it('passes in the logger', () => {
        expect(callArgs[2]).to.have.property('logger', logger)
      })

      it('passes in the orderbooks', () => {
        expect(callArgs[2]).to.have.property('orderbooks', orderbooks)
      })

      it('passes in auth', () => {
        expect(callArgs[2]).to.have.property('auth', auth)
      })
    })
  })

  describe('#getSupportedMarkets', () => {
    let callOrder = 2
    let callArgs

    beforeEach(() => {
      callArgs = GrpcMethod.args[callOrder]
    })

    it('exposes an implementation', () => {
      expect(server.implementation).to.have.property('getSupportedMarkets')
      expect(server.implementation.getSupportedMarkets).to.be.a('function')
    })

    it('creates a GrpcMethod', () => {
      expect(GrpcMethod).to.have.been.called()
      expect(GrpcMethod).to.have.been.calledWithNew()
      expect(server.implementation.getSupportedMarkets).to.be.equal(fakeRegistered)
    })

    it('provides the method', () => {
      expect(callArgs[0]).to.be.equal(getSupportedMarketsStub)
    })

    it('provides a message id', () => {
      expect(callArgs[1]).to.be.equal('[OrderBookService:getSupportedMarkets]')
    })

    describe('request options', () => {
      it('passes in the logger', () => {
        expect(callArgs[2]).to.have.property('logger', logger)
        expect(callArgs[2].logger).to.be.equal(logger)
      })

      it('passes in the relayer', () => {
        expect(callArgs[2]).to.have.property('relayer')
        expect(callArgs[2].relayer).to.be.equal(relayer)
      })

      it('passes in the orderbooks', () => {
        expect(callArgs[2]).to.have.property('orderbooks')
        expect(callArgs[2].orderbooks).to.be.equal(orderbooks)
      })
    })
  })

  describe('#getMarketStatsMarkets', () => {
    let callOrder = 3
    let callArgs

    beforeEach(() => {
      callArgs = GrpcMethod.args[callOrder]
    })

    it('exposes an implementation', () => {
      expect(server.implementation).to.have.property('getMarketStats')
      expect(server.implementation.getMarketStats).to.be.a('function')
    })

    it('creates a GrpcMethod', () => {
      expect(GrpcMethod).to.have.been.called()
      expect(GrpcMethod).to.have.been.calledWithNew()
      expect(server.implementation.getMarketStats).to.be.equal(fakeRegistered)
    })

    it('provides the method', () => {
      expect(callArgs[0]).to.be.equal(getMarketStatsStub)
    })

    it('provides a message id', () => {
      expect(callArgs[1]).to.be.equal('[OrderBookService:getMarketStats]')
    })

    describe('request options', () => {
      it('passes in the logger', () => {
        expect(callArgs[2]).to.have.property('logger', logger)
        expect(callArgs[2].logger).to.be.equal(logger)
      })

      it('passes in the orderbooks', () => {
        expect(callArgs[2]).to.have.property('orderbooks')
        expect(callArgs[2].orderbooks).to.be.equal(orderbooks)
      })
    })
  })

  describe('#getTrades', () => {
    let callOrder = 4
    let callArgs

    beforeEach(() => {
      callArgs = GrpcMethod.args[callOrder]
    })

    it('exposes an implementation', () => {
      expect(server.implementation).to.have.property('getTrades')
      expect(server.implementation.getTrades).to.be.a('function')
    })

    it('creates a GrpcMethod', () => {
      expect(GrpcMethod).to.have.been.called()
      expect(GrpcMethod).to.have.been.calledWithNew()
      expect(server.implementation.getTrades).to.be.equal(fakeRegistered)
    })

    it('provides the method', () => {
      expect(callArgs[0]).to.be.equal(getTradesStub)
    })

    it('provides a message id', () => {
      expect(callArgs[1]).to.be.equal('[OrderBookService:getTrades]')
    })

    describe('request options', () => {
      it('passes in the logger', () => {
        expect(callArgs[2]).to.have.property('logger', logger)
        expect(callArgs[2].logger).to.be.equal(logger)
      })

      it('passes in the orderbooks', () => {
        expect(callArgs[2]).to.have.property('orderbooks')
        expect(callArgs[2].orderbooks).to.be.equal(orderbooks)
      })
    })
  })
})
