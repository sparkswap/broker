const path = require('path')
const {
  sinon,
  rewire,
  expect
} = require('test/test-helper')

const status = rewire(path.resolve(__dirname, 'status'))

describe('cli order status', () => {
  let args
  let opts
  let logger
  let rpcAddress
  let getBlockOrderStub
  let daemonStub

  beforeEach(() => {
    args = {
      blockOrderId: 'abc123'
    }
    rpcAddress = 'test:1337'
    opts = { rpcAddress }
    logger = { info: sinon.stub(), error: sinon.stub() }

    getBlockOrderStub = sinon.stub()
    daemonStub = sinon.stub()
    daemonStub.prototype.orderService = { getBlockOrder: getBlockOrderStub }

    status.__set__('BrokerDaemonClient', daemonStub)

    status(args, opts, logger)
  })

  it('calls broker daemon for the order status', () => {
    expect(daemonStub).to.have.been.calledWith(rpcAddress)
    expect(getBlockOrderStub).to.have.been.calledOnce()
  })
})
