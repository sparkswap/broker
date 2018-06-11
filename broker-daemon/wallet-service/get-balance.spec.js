const path = require('path')
const { expect, rewire, sinon } = require('test/test-helper')

const balance = rewire(path.resolve(__dirname, 'get-balance'))

describe('get-balance', () => {
  let balanceResponseStub
  let logger
  let walletBalanceStub
  let expectedBalance
  let engine

  beforeEach(() => {
    logger = sinon.stub()
    expectedBalance = 1000
    walletBalanceStub = sinon.stub().returns(expectedBalance)
    balanceResponseStub = sinon.stub()

    engine = { getTotalBalance: walletBalanceStub }
    logger = { info: sinon.stub() }
  })

  beforeEach(async () => {
    balance({ logger, engine }, { GetBalanceResponse: balanceResponseStub })
  })

  it('calls an engine.getTotalBalance', () => {
    expect(walletBalanceStub).to.have.been.called()
  })

  it('constructs a BalanceResponse', () => {
    expect(balanceResponseStub).to.have.been.calledWith(
      sinon.match({ balance: expectedBalance })
    )
  })
})
