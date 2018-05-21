const path = require('path')
const { expect, rewire, sinon } = require('test/test-helper')

const balance = rewire(path.resolve(__dirname, 'get-balance'))

describe('get-balance', () => {
  let balanceResponseStub
  let logger
  let walletBalanceStub
  let expectedResponse

  before(() => {
    logger = sinon.stub()
    expectedResponse = { totalBalance: 1000 }
    walletBalanceStub = sinon.stub().returns(expectedResponse)
    balanceResponseStub = sinon.stub()

    const engine = {
      walletBalance: walletBalanceStub
    }

    logger = { info: sinon.stub() }

    balance({ logger, engine }, { GetBalanceResponse: balanceResponseStub })
  })

  it('calls an engine with walletBalance', () => {
    expect(walletBalanceStub).to.have.been.called()
  })

  it('constructs a BalanceResponse', () => {
    expect(balanceResponseStub).to.have.been.calledWith(
      sinon.match({ balance: expectedResponse.totalBalance })
    )
  })
})
