const path = require('path')
const {
  expect,
  rewire,
  sinon
} = require('test/test-helper')

const walletSummary = rewire(path.resolve(__dirname, 'wallet-summary'))

describe('wallet-summary', () => {
  let logger
  let params
  let WalletSummaryResponse
  let symbol
  let engine
  let engines

  beforeEach(() => {
    logger = {
      debug: sinon.stub(),
      error: sinon.stub()
    }
    symbol = 'BTC'
    params = {
      symbol
    }
    engine = {
      getChainTransactions: sinon.stub().resolves([])
    }
    engines = new Map([
      ['BTC', engine]
    ])

    WalletSummaryResponse = sinon.stub()
  })

  it('throws an error is engine could not be found', () => {
    params = { symbol: 'LTC' }
    return expect(walletSummary({ logger, params, engines }, { WalletSummaryResponse })).to.eventually.be.rejected('No engine found for symbol')
  })

  it('logs if no transactions exist', async () => {
    await walletSummary({ logger, params, engines }, { WalletSummaryResponse })
    expect(WalletSummaryResponse).to.have.been.calledWith({ transactions: [] })
    expect(logger.debug).to.have.been.calledWith(sinon.match('No transactions found'))
  })

  it('returns transactions', async () => {
    const expectedTransactions = [{
      type: 'DEPOSIT',
      amount: '201000.00000000',
      transactionHash: 'deposit',
      blockHeight: '123',
      timestamp: '1234',
      fees: '0.00000000',
      pending: false
    }, {
      type: 'CHANNEL_OPEN',
      amount: '-11000.00000000',
      transactionHash: 'channelopen',
      blockHeight: '1234',
      timestamp: '1234',
      fees: '1000.00000000',
      pending: false
    }, {
      type: 'CHANNEL_CLOSE',
      amount: '9000.00000000',
      transactionHash: 'channelclose',
      blockHeight: '12345',
      timestamp: '1234',
      fees: '1000.00000000',
      pending: false
    }]

    engine.getChainTransactions.resolves(expectedTransactions)
    await walletSummary({ logger, params, engines }, { WalletSummaryResponse })
    expect(WalletSummaryResponse).to.have.been.calledWith({ transactions: expectedTransactions })
  })
})
