const path = require('path')
const { expect, rewire, sinon } = require('test/test-helper')
const { PublicError } = require('grpc-methods')
const { Big } = require('../utils')
const commitBalance = rewire(path.resolve(__dirname, 'commit-balance'))

describe('commit-balance', () => {
  let EmptyResponse
  let params
  let relayer
  let logger
  let engine
  let publicKeyStub
  let createChannelStub
  let publicKey
  let res
  let envRevert
  let getPublicKeyStub
  let brokerPublicKey
  let createChannelRelayerStub
  let addressRevert
  let convertBalanceStub

  beforeEach(() => {
    EmptyResponse = sinon.stub()
    publicKey = '12345'
    brokerPublicKey = 'asdf'
    publicKeyStub = sinon.stub().resolves({ publicKey })
    getPublicKeyStub = sinon.stub().resolves(brokerPublicKey)
    createChannelRelayerStub = sinon.stub().resolves({})
    convertBalanceStub = sinon.stub().returns(Big('100'))
    createChannelStub = sinon.stub()
    logger = {
      info: sinon.stub(),
      error: sinon.stub()
    }
    engine = {
      createChannel: createChannelStub,
      getPublicKey: getPublicKeyStub
    }
    params = {
      balance: 10000000,
      symbol: 'BTC'
    }
    relayer = { paymentNetworkService: { getPublicKey: publicKeyStub, createChannel: createChannelRelayerStub } }
    envRevert = commitBalance.__set__('EXCHANGE_LND_HOST', '127.0.0.1')
    addressRevert = commitBalance.__set__('LND_EXTERNAL_ADDRESS', '127.0.0.2')
    commitBalance.__set__('convertBalance', convertBalanceStub)
  })

  afterEach(() => {
    envRevert()
    addressRevert()
  })

  describe('committing a balance to the exchange', () => {
    beforeEach(async () => {
      res = await commitBalance({ params, relayer, logger, engine }, { EmptyResponse })
    })

    it('receives a public key from the relayer', () => {
      expect(publicKeyStub).to.have.been.calledWith({})
    })

    it('creates a channel through an engine', () => {
      const lndHost = commitBalance.__get__('EXCHANGE_LND_HOST')
      expect(createChannelStub).to.have.been.calledWith(lndHost, publicKey, params.balance)
    })

    it('retrieves the publicKey from the engine', () => {
      expect(engine.getPublicKey).to.have.been.called()
    })

    it('converts the balance to the currency of the channel to open on the relayer', () => {
      expect(convertBalanceStub).to.have.been.calledWith(Big(10000000), 'BTC', 'LTC')
    })

    it('makes a request to the relayer to create a channel', () => {
      const lndExternalAddress = commitBalance.__get__('LND_EXTERNAL_ADDRESS')
      expect(relayer.paymentNetworkService.createChannel).to.have.been.calledWith({
        publicKey: brokerPublicKey,
        host: lndExternalAddress,
        balance: '100',
        symbol: 'LTC'
      })
    })

    it('constructs a EmptyResponse', () => {
      expect(EmptyResponse).to.have.been.calledWith({})
    })

    it('returns a EmptyResponse', () => {
      expect(res).to.be.eql(new EmptyResponse())
    })
  })

  describe('balance under minimum amount', () => {
    it('throws an error for an incorrect balance', () => {
      params.balance = 100
      return expect(
        commitBalance({ params, relayer, logger, engine }, { EmptyResponse })
      ).to.be.rejectedWith(PublicError)
    })
  })

  describe('balance over allowed maximum value', () => {
    let maxBalance = commitBalance.__get__('MAX_CHANNEL_BALANCE')

    it('throws an error for an incorrect balance', () => {
      params.balance = maxBalance + 1
      return expect(
        commitBalance({ params, relayer, logger, engine }, { EmptyResponse })
      ).to.be.rejectedWith(PublicError)
    })
  })
})
