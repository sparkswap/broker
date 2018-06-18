const path = require('path')
const { expect, rewire, sinon } = require('test/test-helper')

const getBalance = rewire(path.resolve(__dirname, 'get-balance'))

describe('get-balance', () => {
  let balanceResponseStub
  let logger
  let walletBalanceStub
  let expectedBalance
  let engine
  let channelBalancesStub
  let channelBalances
  let committedBalanceStub
  let uncommittedBalanceStub
  let uncommittedBalance
  let committedBalance

  beforeEach(() => {
    logger = sinon.stub()
    expectedBalance = 1000
    committedBalance = expectedBalance - 500
    uncommittedBalance = expectedBalance - 500
    channelBalances = [
      { symbol: 'BTC', value: '100' }
    ]
    walletBalanceStub = sinon.stub().returns(expectedBalance)
    balanceResponseStub = sinon.stub()
    channelBalancesStub = sinon.stub().returns(channelBalances)
    committedBalanceStub = sinon.stub().returns(committedBalance)
    uncommittedBalanceStub = sinon.stub().returns(uncommittedBalance)

    engine = {
      getTotalBalance: walletBalanceStub,
      getCommittedBalance: committedBalanceStub,
      getUncommittedBalance: uncommittedBalanceStub,
      getChannelBalances: channelBalancesStub
    }
    logger = { info: sinon.stub() }
  })

  beforeEach(async () => {
    await getBalance({ logger, engine }, { GetBalanceResponse: balanceResponseStub })
  })

  it('calls an engine.getTotalBalance', () => {
    expect(walletBalanceStub).to.have.been.called()
  })

  it('calls an engine for channel balances', () => {
    expect(channelBalancesStub).to.have.been.called()
  })

  it('constructs a BalanceResponse', () => {
    expect(balanceResponseStub).to.have.been.calledWith(
      sinon.match({
        totalBalance: expectedBalance,
        totalCommittedBalance: committedBalance,
        totalUncommittedBalance: uncommittedBalance,
        committedBalances: channelBalances
      })
    )
  })
})
