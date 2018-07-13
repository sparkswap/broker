const path = require('path')
const { expect, rewire, sinon } = require('test/test-helper')

const getBalances = rewire(path.resolve(__dirname, 'get-balances'))

describe('get-balance', () => {
  let balanceResponseStub
  let logger
  let walletBalanceStub
  let engine
  let engines
  let totalChannelBalanceStub
  let engineType
  let expectedTotalBalance
  let expectedChannelBalance

  beforeEach(() => {
    logger = sinon.stub()
    expectedTotalBalance = 1000
    expectedChannelBalance = 100
    walletBalanceStub = sinon.stub().returns(expectedTotalBalance)
    totalChannelBalanceStub = sinon.stub().returns(expectedChannelBalance)
    balanceResponseStub = sinon.stub()

    engine = {
      getTotalBalance: walletBalanceStub,
      getTotalChannelBalance: totalChannelBalanceStub
    }
    engineType = 'BTC'
    engines = new Map([[engineType, engine]])
    logger = { info: sinon.stub() }
  })

  beforeEach(async () => {
    await getBalances({ logger, engines }, { GetBalancesResponse: balanceResponseStub })
  })

  it('calls an engine.getTotalBalance', () => {
    expect(walletBalanceStub).to.have.been.called()
  })

  it('calls an engine for channel balances', () => {
    expect(totalChannelBalanceStub).to.have.been.called()
  })

  it('constructs a BalanceResponse', () => {
    expect(balanceResponseStub).to.have.been.calledWith(
      sinon.match({})
    )
  })
})
