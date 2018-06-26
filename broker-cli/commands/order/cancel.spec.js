const path = require('path')
const {
  sinon,
  rewire,
  expect
} = require('test/test-helper')

const cancel = rewire(path.resolve(__dirname, 'cancel'))

describe('cli order cancel', () => {
  let args
  let opts
  let logger
  let rpcAddress
  let cancelBlockOrderStub
  let daemonStub

  beforeEach(() => {
    args = {
      blockOrderId: 'abc123'
    }
    rpcAddress = 'test:1337'
    opts = { rpcAddress }
    logger = { info: sinon.stub(), error: sinon.stub() }

    cancelBlockOrderStub = sinon.stub()
    daemonStub = sinon.stub()
    daemonStub.prototype.orderService = { cancelBlockOrder: cancelBlockOrderStub }

    cancel.__set__('BrokerDaemonClient', daemonStub)

    cancel(args, opts, logger)
  })

  it('calls broker daemon for the order cancel', () => {
    expect(daemonStub).to.have.been.calledWith(rpcAddress)
    expect(cancelBlockOrderStub).to.have.been.calledOnce()
  })
})
