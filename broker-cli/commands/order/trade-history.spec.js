const path = require('path')
const {
  sinon,
  rewire,
  expect
} = require('test/test-helper')

const tradeHistory = rewire(path.resolve(__dirname, 'trade-history'))

describe('cli order trade-history', () => {
  let args
  let opts
  let logger
  let rpcAddress
  let getTradeHistoryStub
  let daemonStub

  beforeEach(() => {
    rpcAddress = 'test:1337'
    opts = { rpcAddress }
    logger = { info: sinon.stub(), error: sinon.stub() }

    getTradeHistoryStub = sinon.stub()
    daemonStub = sinon.stub()
    daemonStub.prototype.orderService = { getTradeHistory: getTradeHistoryStub }

    tradeHistory.__set__('BrokerDaemonClient', daemonStub)
  })

  it('calls broker daemon for the order tradeHistory', async () => {
    await tradeHistory(args, opts, logger)

    expect(daemonStub).to.have.been.calledWith(rpcAddress)
    expect(getTradeHistoryStub).to.have.been.calledOnce()
  })
})
