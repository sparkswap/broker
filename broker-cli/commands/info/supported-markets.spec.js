const path = require('path')
const {
  sinon,
  rewire,
  expect
} = require('test/test-helper')

const supportedMarkets = rewire(path.resolve(__dirname, 'supported-markets'))

describe('cli info supported-markets', () => {
  let opts
  let logger
  let rpcAddress
  let getSupportedMarketsStub
  let daemonStub

  beforeEach(async () => {
    rpcAddress = 'test:1337'
    opts = { rpcAddress }
    logger = { info: sinon.spy(), error: sinon.stub() }

    getSupportedMarketsStub = sinon.stub().returns({markets: 'fake'})
    daemonStub = sinon.stub()
    daemonStub.prototype.infoService = { getSupportedMarkets: getSupportedMarketsStub }

    supportedMarkets.__set__('BrokerDaemonClient', daemonStub)
  })
  it('calls broker daemon for the info supported-markets', async () => {
    await supportedMarkets(opts, logger)
    expect(daemonStub).to.have.been.calledWith(rpcAddress)
    expect(getSupportedMarketsStub).to.have.been.calledOnce()
  })

  it('logs supported markets for json flag', async () => {
    const json = true
    opts = { rpcAddress, json }
    await supportedMarkets(opts, logger)
    expect(logger.info).to.have.been.calledOnce()
    expect(logger.info).to.have.been.calledWith(JSON.stringify({markets: 'fake'}))
  })
})
