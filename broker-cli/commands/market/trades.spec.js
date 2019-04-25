const path = require('path')
const {
  sinon,
  rewire,
  expect
} = require('test/test-helper')

const trades = rewire(path.resolve(__dirname, 'trades'))

describe('cli market trades', () => {
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
    logger = { info: sinon.stub(), error: sinon.stub() }

    getTradesStub = sinon.stub()
    daemonStub = sinon.stub()
    daemonStub.prototype.orderBookService = { getTrades: getTradesStub }

    trades.__set__('BrokerDaemonClient', daemonStub)

    trades(args, opts, logger)
  })
  it('calls broker daemon for the info trades', () => {
    expect(daemonStub).to.have.been.calledWith(rpcAddress)
    expect(getTradesStub).to.have.been.calledWith({ market, since, limit })
  })
})
