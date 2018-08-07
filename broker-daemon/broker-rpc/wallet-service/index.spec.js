const path = require('path')
const { expect, rewire, sinon } = require('test/test-helper')

const WalletService = rewire(path.resolve(__dirname))

describe('WalletService', () => {
  let protoPath
  let loadProtoStub
  let logger
  let engines
  let relayer
  let unaryMethodStub
  let responseStub
  let wallet
  let registerSpy
  let newDepositAddress
  let getPaymentChannelNetworkAddress
  let balanceSpy
  let commitBalanceSpy
  let getTradingCapacities
  let orderbooks

  before(() => {
    responseStub = sinon.stub()
    protoPath = 'example/path.proto'
    loadProtoStub = sinon.stub().returns({
      WalletService: { service: sinon.stub() },
      NewDepositAddressResponse: responseStub,
      GetBalancesResponse: responseStub,
      GetPaymentChannelNetworkAddressResponse: responseStub,
      google: {
        protobuf: {
          Empty: responseStub
        }
      },
      GetTradingCapacitiesResponse: responseStub
    })
    logger = sinon.stub()
    engines = sinon.stub()
    relayer = sinon.stub()
    orderbooks = sinon.stub()
    newDepositAddress = sinon.spy()
    getPaymentChannelNetworkAddress = sinon.stub()
    getTradingCapacities = sinon.stub()
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
    WalletService.__set__('getPaymentChannelNetworkAddress', getPaymentChannelNetworkAddress)
    WalletService.__set__('getTradingCapacities', getTradingCapacities)

    wallet = new WalletService(protoPath, { logger, engines, relayer, orderbooks })
  })

  it('sets a protoPath', () => expect(wallet.protoPath).to.eql(protoPath))
  it('sets a logger', () => expect(wallet.logger).to.eql(logger))
  it('sets engines', () => expect(wallet.engines).to.eql(engines))

  it('loads a proto file', () => {
    expect(loadProtoStub).to.have.been.calledWith(protoPath)
  })

  describe('grpc implementations', () => {
    it('creates a unary method for newAddress', () => {
      const expectedMessageId = '[WalletService:newDepositAddress]'

      expect(unaryMethodStub).to.have.been.calledWith(
        newDepositAddress,
        expectedMessageId,
        { logger, engines },
        { NewDepositAddressResponse: responseStub }
      )
    })

    it('creates a unary method for getBalances', () => {
      const expectedMessageId = '[WalletService:getBalances]'

      expect(unaryMethodStub).to.have.been.calledWith(
        balanceSpy,
        expectedMessageId,
        { logger, engines },
        { GetBalancesResponse: responseStub }
      )
    })

    it('creates a unary method for commitBalance', () => {
      const expectedMessageId = '[WalletService:commitBalance]'

      expect(unaryMethodStub).to.have.been.calledWith(
        commitBalanceSpy,
        expectedMessageId,
        { logger, engines, relayer },
        { EmptyResponse: responseStub }
      )
    })

    it('creates a unary method for getPaymentChannelNetworkAddress', () => {
      const expectedMessageId = '[WalletService:getPaymentChannelNetworkAddress]'

      expect(unaryMethodStub).to.have.been.calledWith(
        getPaymentChannelNetworkAddress,
        expectedMessageId,
        { logger, engines },
        { GetPaymentChannelNetworkAddressResponse: responseStub }
      )
    })

    it('creates a unary method for getPaymentChannelNetworkAddress', () => {
      const expectedMessageId = '[WalletService:getTradingCapacities]'

      expect(unaryMethodStub).to.have.been.calledWith(
        getTradingCapacities,
        expectedMessageId,
        { logger, engines, orderbooks },
        { GetTradingCapacitiesResponse: responseStub }
      )
    })
  })
})
