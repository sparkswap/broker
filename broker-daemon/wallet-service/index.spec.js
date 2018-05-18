const path = require('path')
const { expect, rewire, sinon } = require('test/test-helper')

const WalletService = rewire(path.resolve(__dirname))

describe('WalletService', () => {
  let protoPath
  let loadProtoStub
  let logger
  let engine
  let unaryMethodStub
  let responseStub
  let wallet
  let registerSpy
  let newDepositAddress

  before(() => {
    responseStub = sinon.stub()
    protoPath = 'example/path.proto'
    loadProtoStub = sinon.stub().returns({
      Wallet: { service: sinon.stub() },
      NewDepositAddressResponse: responseStub
    })
    logger = sinon.stub()
    engine = sinon.stub()
    newDepositAddress = sinon.spy()
    unaryMethodStub = sinon.stub()
    registerSpy = sinon.spy()
    unaryMethodStub.prototype.register = registerSpy

    WalletService.__set__('loadProto', loadProtoStub)
    WalletService.__set__('GrpcUnaryMethod', unaryMethodStub)
    WalletService.__set__('newDepositAddress', newDepositAddress)

    wallet = new WalletService(protoPath, { logger, engine })
  })

  it('sets a protoPath', () => expect(wallet.protoPath).to.eql(protoPath))
  it('sets a logger', () => expect(wallet.logger).to.eql(logger))
  it('sets an engine', () => expect(wallet.engine).to.eql(engine))

  it('loads a proto file', () => {
    expect(loadProtoStub).to.have.been.calledWith(protoPath)
  })

  it('creates a unary method for newAddress', () => {
    const expectedMessageId = '[Wallet:newDepositAddress]'

    expect(unaryMethodStub).to.have.been.calledWith(
      newDepositAddress,
      expectedMessageId,
      { logger, engine },
      { NewDepositAddressResponse: responseStub }
    )
  })
})
