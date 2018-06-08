const path = require('path')
const { expect, rewire, sinon } = require('test/test-helper')

const commitBalance = rewire(path.resolve(__dirname, 'commit-balance'))

describe('commit-balance', () => {
  let CommitBalanceResponse
  let params
  let relayer
  let logger
  let engine
  let publicKeyStub
  let createChannelStub
  let publicKey
  let res

  beforeEach(() => {
    CommitBalanceResponse = sinon.stub()
    publicKey = '12345'
    publicKeyStub = sinon.stub().returns({ publicKey })
    createChannelStub = sinon.stub()
    logger = {
      info: sinon.stub()
    }
    engine = {
      createChannel: createChannelStub
    }
    params = {
      balance: 100,
      market: 'BTC'
    }
    relayer = { paymentNetworkService: { getPublicKey: publicKeyStub } }
  })

  beforeEach(async () => {
    res = await commitBalance({ params, relayer, logger, engine }, { CommitBalanceResponse })
  })

  it('receives a public key from the relayer', () => {
    expect(publicKeyStub).to.have.been.calledWith({})
  })

  it('creates a channel through an engine', () => {
    const lndHost = commitBalance.__get__('EXCHANGE_LND_HOST')
    const minFundAmount = commitBalance.__get__('MINIMUM_FUNDING_AMOUNT')
    expect(createChannelStub).to.have.been.calledWith(lndHost, publicKey, minFundAmount)
  })

  it('constructs a CommitBalanceResponse', () => {
    expect(CommitBalanceResponse).to.have.been.calledWith(
      sinon.match({ status: 'channel opened successfully' })
    )
  })

  it('returns a CommitBalanceResponse', () => {
    expect(res).to.be.eql(new CommitBalanceResponse())
  })
})
