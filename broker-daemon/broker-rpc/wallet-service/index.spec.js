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
  let commitSpy
  let getTradingCapacities
  let orderbooks
  let releaseChannels
  let withdrawFunds
  let createWallet
  let unlockWallet
  let walletHistory
  let auth
  let blockOrderWorker

  before(() => {
    responseStub = sinon.stub()
    protoPath = 'example/path.proto'
    loadProtoStub = sinon.stub().returns({
      broker: {
        rpc: {
          WalletService: { service: sinon.stub() },
          NewDepositAddressResponse: responseStub,
          GetBalancesResponse: responseStub,
          GetPaymentChannelNetworkAddressResponse: responseStub,
          GetTradingCapacitiesResponse: responseStub,
          WithdrawFundsResponse: responseStub,
          CreateWalletResponse: responseStub,
          ReleaseChannelsResponse: responseStub,
          WalletHistoryResponse: responseStub,
          google: {
            protobuf: {
              Empty: responseStub
            }
          }
        }
      }
    })
    auth = sinon.stub()
    logger = sinon.stub()
    engines = sinon.stub()
    relayer = sinon.stub()
    orderbooks = sinon.stub()
    newDepositAddress = sinon.spy()
    getPaymentChannelNetworkAddress = sinon.stub()
    getTradingCapacities = sinon.stub()
    releaseChannels = sinon.stub()
    withdrawFunds = sinon.stub()
    createWallet = sinon.stub()
    unlockWallet = sinon.stub()
    walletHistory = sinon.stub()
    balanceSpy = sinon.spy()
    commitSpy = sinon.spy()
    unaryMethodStub = sinon.stub()
    registerSpy = sinon.spy()
    blockOrderWorker = sinon.stub()
    unaryMethodStub.prototype.register = registerSpy

    WalletService.__set__('loadProto', loadProtoStub)
    WalletService.__set__('GrpcUnaryMethod', unaryMethodStub)
    WalletService.__set__('newDepositAddress', newDepositAddress)
    WalletService.__set__('getBalances', balanceSpy)
    WalletService.__set__('commit', commitSpy)
    WalletService.__set__('getPaymentChannelNetworkAddress', getPaymentChannelNetworkAddress)
    WalletService.__set__('getTradingCapacities', getTradingCapacities)
    WalletService.__set__('releaseChannels', releaseChannels)
    WalletService.__set__('withdrawFunds', withdrawFunds)
    WalletService.__set__('createWallet', createWallet)
    WalletService.__set__('unlockWallet', unlockWallet)
    WalletService.__set__('walletHistory', walletHistory)

    wallet = new WalletService(protoPath, { logger, engines, relayer, orderbooks, auth, blockOrderWorker })
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
        { logger, engines, auth },
        { NewDepositAddressResponse: responseStub }
      )
    })

    it('creates a unary method for getBalances', () => {
      const expectedMessageId = '[WalletService:getBalances]'

      expect(unaryMethodStub).to.have.been.calledWith(
        balanceSpy,
        expectedMessageId,
        { logger, engines, auth },
        { GetBalancesResponse: responseStub }
      )
    })

    it('creates a unary method for commit', () => {
      const expectedMessageId = '[WalletService:commit]'

      expect(unaryMethodStub).to.have.been.calledWith(
        commitSpy,
        expectedMessageId,
        { logger, engines, relayer, orderbooks, auth },
        { EmptyResponse: responseStub }
      )
    })

    it('creates a unary method for getPaymentChannelNetworkAddress', () => {
      const expectedMessageId = '[WalletService:getPaymentChannelNetworkAddress]'

      expect(unaryMethodStub).to.have.been.calledWith(
        getPaymentChannelNetworkAddress,
        expectedMessageId,
        { logger, engines, auth },
        { GetPaymentChannelNetworkAddressResponse: responseStub }
      )
    })

    it('creates a unary method for getTradingCapacities', () => {
      const expectedMessageId = '[WalletService:getTradingCapacities]'

      expect(unaryMethodStub).to.have.been.calledWith(
        getTradingCapacities,
        expectedMessageId,
        { logger, engines, orderbooks, auth, blockOrderWorker },
        { GetTradingCapacitiesResponse: responseStub }
      )
    })

    it('creates a unary method for releaseChannels', () => {
      const expectedMessageId = '[WalletService:releaseChannels]'

      expect(unaryMethodStub).to.have.been.calledWith(
        releaseChannels,
        expectedMessageId,
        { logger, engines, orderbooks, blockOrderWorker, auth },
        { ReleaseChannelsResponse: responseStub }
      )
    })

    it('creates a unary method for withdrawFunds', () => {
      const expectedMessageId = '[WalletService:withdrawFunds]'

      expect(unaryMethodStub).to.have.been.calledWith(
        withdrawFunds,
        expectedMessageId,
        { logger, engines, auth },
        { WithdrawFundsResponse: responseStub }
      )
    })

    it('creates a unary method for createWallet', () => {
      const expectedMessageId = '[WalletService:createWallet]'

      expect(unaryMethodStub).to.have.been.calledWith(
        createWallet,
        expectedMessageId,
        { logger, engines, auth },
        { CreateWalletResponse: responseStub }
      )
    })

    it('creates a unary method for unlockWallet', () => {
      const expectedMessageId = '[WalletService:unlockWallet]'

      expect(unaryMethodStub).to.have.been.calledWith(
        unlockWallet,
        expectedMessageId,
        { logger, engines, auth },
        { EmptyResponse: responseStub }
      )
    })

    it('creates a unary method for walletHistory', () => {
      const expectedMessageId = '[WalletService:walletHistory]'

      expect(unaryMethodStub).to.have.been.calledWith(
        walletHistory,
        expectedMessageId,
        { logger, engines, auth },
        { WalletHistoryResponse: responseStub }
      )
    })
  })
})
