const path = require('path')
const {
  sinon,
  rewire,
  expect
} = require('test/test-helper')

const cancelAll = rewire(path.resolve(__dirname, 'cancel-all'))

describe('cli order cancel-all', () => {
  let args
  let opts
  let logger
  let rpcAddress
  let cancelAllBlockOrdersStub
  let daemonStub
  let market

  beforeEach(() => {
    rpcAddress = 'test:1337'
    market = 'BTC/LTC'
    opts = { rpcAddress, market }
    logger = { info: sinon.stub(), error: sinon.stub() }

    cancelAllBlockOrdersStub = sinon.stub().resolves({
      cancelledOrders: ['adsfasdf'],
      failedToCancelOrders: ['treedfg']
    })
    daemonStub = sinon.stub()
    daemonStub.prototype.orderService = { cancelAllBlockOrders: cancelAllBlockOrdersStub }

    cancelAll.__set__('BrokerDaemonClient', daemonStub)

    cancelAll(args, opts, logger)
  })

  it('calls broker daemon for the order cancel', () => {
    expect(daemonStub).to.have.been.calledWith(rpcAddress)
    expect(cancelAllBlockOrdersStub).to.have.been.calledOnce()
  })
})
