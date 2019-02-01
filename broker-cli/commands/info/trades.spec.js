const path = require('path')
const {
  sinon,
  rewire,
  expect
} = require('test/test-helper')

const trades = rewire(path.resolve(__dirname, 'trades'))

describe('cli info trades', () => {
  let args
  let since
  let limit
  let market
  let opts
  let logger
  let rpcAddress
  let getTradesStub
  let daemonStub

  beforeEach(() => {
    rpcAddress = 'test:1337'
    market = 'BTC/LTC'
    since = '2018-09-20T18:58:07.866Z'
    limit = 10

    args = { since, limit }
    opts = { market, rpcAddress }
    logger = { info: sinon.spy(), error: sinon.stub() }

    getTradesStub = sinon.stub().returns({ trades: 'fakeTrades' })
    daemonStub = sinon.stub()
    daemonStub.prototype.infoService = { getTrades: getTradesStub }

    trades.__set__('BrokerDaemonClient', daemonStub)
  })
  it('calls broker daemon for the info trades', () => {
    trades(args, opts, logger)
    expect(daemonStub).to.have.been.calledWith(rpcAddress)
    expect(getTradesStub).to.have.been.calledWith({market, since, limit})
  })
  describe('with json output', async () => {
    it('logs trades', async () => {
      const json = true
      opts = { rpcAddress, json }
      await trades(args, opts, logger)
      expect(logger.info).to.have.been.calledOnce()
      expect(logger.info).to.have.been.calledWith(JSON.stringify({ trades: 'fakeTrades' }))
    })
  })
})
