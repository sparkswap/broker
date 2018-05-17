const path = require('path')
const { expect, rewire, sinon } = require('test/test-helper')

const WalletService = rewire(path.resolve(__dirname))

describe('WalletService', () => {
  let protoPath
  let loadProtoStub
  let logger
  let engine
  let unaryMethodStub
  let responseSpy
  let wallet
  let registerSpy
  let newWalletSpy

  before(() => {
    responseSpy = sinon.spy()
    protoPath = 'example/path.proto'
    loadProtoStub = sinon.stub().returns({
      Wallet: { service: sinon.stub() },
      NewAddressResponse: responseSpy
    })
    logger = sinon.stub()
    engine = sinon.stub()
    newWalletSpy = sinon.spy()
    unaryMethodStub = sinon.stub()
    registerSpy = sinon.spy()
    unaryMethodStub.prototype.register = registerSpy

    WalletService.__set__('loadProto', loadProtoStub)
    WalletService.__set__('GrpcUnaryMethod', unaryMethodStub)
    WalletService.__set__('newWalletAddress', newWalletSpy)

    wallet = new WalletService(protoPath, { logger, engine })
  })

  it('sets a protoPath', () => expect(wallet.protoPath).to.eql(protoPath))
  it('sets a logger', () => expect(wallet.logger).to.eql(logger))
  it('sets an engine', () => expect(wallet.engine).to.eql(engine))

  it('loads a proto file', () => {
    expect(loadProtoStub).to.have.been.calledWith(protoPath)
  })

  it('creates a unary method for newAddress', () => {
    const expectedMessageId = '[Wallet:newAddress]'

    expect(unaryMethodStub).to.have.been.calledWith(
      newWalletSpy,
      expectedMessageId,
      { logger, engine },
      { NewAddressResponse: responseSpy }
    )
  })
})
