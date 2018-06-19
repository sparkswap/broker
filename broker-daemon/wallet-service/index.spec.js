const path = require('path')
const { expect, rewire, sinon } = require('test/test-helper')

const WalletService = rewire(path.resolve(__dirname))

describe('WalletService', () => {
  let protoPath
  let loadProtoStub
  let logger
  let engine
  let relayer
  let unaryMethodStub
  let responseStub
  let wallet
  let registerSpy
  let newDepositAddress
  let balanceSpy
  let commitBalanceSpy

  before(() => {
    responseStub = sinon.stub()
    protoPath = 'example/path.proto'
    loadProtoStub = sinon.stub().returns({
      WalletService: { service: sinon.stub() },
      NewDepositAddressResponse: responseStub,
      GetBalancesResponse: responseStub,
      google: {
        protobuf: {
          Empty: responseStub
        }
      }
    })
    logger = sinon.stub()
    engine = sinon.stub()
    relayer = sinon.stub()
    newDepositAddress = sinon.spy()
    balanceSpy = sinon.spy()
    commitBalanceSpy = sinon.spy()
    unaryMethodStub = sinon.stub()
    registerSpy = sinon.spy()
    unaryMethodStub.prototype.register = registerSpy

    WalletService.__set__('loadProto', loadProtoStub)
    WalletService.__set__('GrpcUnaryMethod', unaryMethodStub)
    WalletService.__set__('newDepositAddress', newDepositAddress)
    WalletService.__set__('getBalances', balanceSpy)
    WalletService.__set__('commitBalance', commitBalanceSpy)

    wallet = new WalletService(protoPath, { logger, engine, relayer })
  })

  it('sets a protoPath', () => expect(wallet.protoPath).to.eql(protoPath))
  it('sets a logger', () => expect(wallet.logger).to.eql(logger))
  it('sets an engine', () => expect(wallet.engine).to.eql(engine))

  it('loads a proto file', () => {
    expect(loadProtoStub).to.have.been.calledWith(protoPath)
  })

  describe('grpc implementations', () => {
    it('creates a unary method for newAddress', () => {
      const expectedMessageId = '[WalletService:newDepositAddress]'

      expect(unaryMethodStub).to.have.been.calledWith(
        newDepositAddress,
        expectedMessageId,
        { logger, engine },
        { NewDepositAddressResponse: responseStub }
      )
    })

    it('creates a unary method for getBalances', () => {
      const expectedMessageId = '[WalletService:getBalances]'

      expect(unaryMethodStub).to.have.been.calledWith(
        balanceSpy,
        expectedMessageId,
        { logger, engine },
        { GetBalancesResponse: responseStub }
      )
    })

    it('creates a unary method for commitBalance', () => {
      const expectedMessageId = '[WalletService:commitBalance]'

      expect(unaryMethodStub).to.have.been.calledWith(
        commitBalanceSpy,
        expectedMessageId,
        { logger, engine, relayer },
        { EmptyResponse: responseStub }
      )
    })
  })
})
