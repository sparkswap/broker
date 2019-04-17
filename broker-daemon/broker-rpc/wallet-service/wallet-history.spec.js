const path = require('path')
const {
  expect,
  rewire,
  sinon
} = require('test/test-helper')

const walletHistory = rewire(path.resolve(__dirname, 'wallet-history'))

describe('wallet-history', () => {
  let logger
  let params
  let WalletHistoryResponse
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

    WalletHistoryResponse = sinon.stub()
  })

  it('throws an error is engine could not be found', () => {
    params = { symbol: 'LTC' }
    return expect(walletHistory({ logger, params, engines }, { WalletHistoryResponse })).to.eventually.be.rejected('No engine found for symbol')
  })

  it('logs a transaction count', async () => {
    await walletHistory({ logger, params, engines }, { WalletHistoryResponse })
    expect(WalletHistoryResponse).to.have.been.calledWith({ transactions: [] })
    expect(logger.debug).to.have.been.calledWith(sinon.match('0 transactions'))
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
    await walletHistory({ logger, params, engines }, { WalletHistoryResponse })
    expect(WalletHistoryResponse).to.have.been.calledWith({ transactions: expectedTransactions })
  })
})
