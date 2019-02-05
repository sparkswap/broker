const path = require('path')
const {
  sinon,
  rewire,
  expect
} = require('test/test-helper')

const supportedMarkets = rewire(path.resolve(__dirname, 'supported-markets'))

describe('cli market supported-markets', () => {
  let opts
  let logger
  let rpcAddress
  let getSupportedMarketsStub
  let daemonStub

  beforeEach(() => {
    rpcAddress = 'test:1337'
    opts = { rpcAddress }
    logger = { info: sinon.stub(), error: sinon.stub() }

    getSupportedMarketsStub = sinon.stub()
    daemonStub = sinon.stub()
    daemonStub.prototype.orderBookService = { getSupportedMarkets: getSupportedMarketsStub }

    supportedMarkets.__set__('BrokerDaemonClient', daemonStub)

    supportedMarkets(opts, logger)
  })
  it('calls broker daemon for the market supported-markets', () => {
    expect(daemonStub).to.have.been.calledWith(rpcAddress)
    expect(getSupportedMarketsStub).to.have.been.calledOnce()
  })
})
