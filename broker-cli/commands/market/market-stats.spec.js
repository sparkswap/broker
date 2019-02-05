const path = require('path')
const {
  sinon,
  rewire,
  expect
} = require('test/test-helper')

const marketStats = rewire(path.resolve(__dirname, 'market-stats'))

describe('cli market market-stats', () => {
  let opts
  let logger
  let rpcAddress
  let daemonStub
  let getMarketStatsStub
  let market
  let handleErrorStub

  beforeEach(() => {
    rpcAddress = 'test:1337'
    market = 'BTC/lTC'
    opts = {
      rpcAddress,
      market
    }
    logger = {
      info: sinon.stub(),
      error: sinon.stub()
    }

    handleErrorStub = sinon.stub()
    getMarketStatsStub = sinon.stub()
    daemonStub = sinon.stub()
    daemonStub.prototype.orderBookService = {
      getMarketStats: getMarketStatsStub
    }

    marketStats.__set__('BrokerDaemonClient', daemonStub)
    marketStats.__set__('handleError', handleErrorStub)
  })

  it('calls broker daemon for market stats', () => {
    marketStats(opts, logger)
    expect(daemonStub).to.have.been.calledWith(rpcAddress)
    expect(getMarketStatsStub).to.have.been.calledWith({ market })
  })

  it('handles an error', () => {
    const error = new Error('bad daemon')
    daemonStub.throws(error)
    marketStats(opts, logger)
    expect(handleErrorStub).to.have.been.calledWith(error)
  })
})
