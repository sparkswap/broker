const path = require('path')
const { expect, rewire, sinon } = require('test/test-helper')

const getBalances = rewire(path.resolve(__dirname, 'get-balances'))

describe('get-balance', () => {
  let balanceResponseStub
  let logger
  let walletBalanceStub
  let expectedBalance
  let engine
  let channelBalancesStub
  let channelBalances
  let confirmedBalanceStub
  let unconfirmedBalanceStub
  let unconfirmedBalance
  let confirmedBalance

  beforeEach(() => {
    logger = sinon.stub()
    expectedBalance = 1000
    confirmedBalance = expectedBalance - 500
    unconfirmedBalance = expectedBalance - 500
    channelBalances = [
      { symbol: 'BTC', value: '100' }
    ]
    walletBalanceStub = sinon.stub().returns(expectedBalance)
    balanceResponseStub = sinon.stub()
    channelBalancesStub = sinon.stub().returns(channelBalances)
    confirmedBalanceStub = sinon.stub().returns(confirmedBalance)
    unconfirmedBalanceStub = sinon.stub().returns(unconfirmedBalance)

    engine = {
      getTotalBalance: walletBalanceStub,
      getConfirmedBalance: confirmedBalanceStub,
      getUnconfirmedBalance: unconfirmedBalanceStub,
      getChannelBalances: channelBalancesStub
    }
    logger = { info: sinon.stub() }
  })

  beforeEach(async () => {
    await getBalances({ logger, engine }, { GetBalancesResponse: balanceResponseStub })
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
        totalCommittedBalance: confirmedBalance,
        totalUncommittedBalance: unconfirmedBalance,
        committedBalances: channelBalances
      })
    )
  })
})
