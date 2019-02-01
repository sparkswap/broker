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

    cancelBlockOrderStub = sinon.stub().returns(args)
    daemonStub = sinon.stub()
    daemonStub.prototype.orderService = { cancelBlockOrder: cancelBlockOrderStub }

    cancel.__set__('BrokerDaemonClient', daemonStub)
  })

  it('calls broker daemon for the order cancel', () => {
    cancel(args, opts, logger)
    expect(daemonStub).to.have.been.calledWith(rpcAddress)
    expect(cancelBlockOrderStub).to.have.been.calledOnce()
  })

  describe('with json output', async () => {
    it('logs trades', async () => {
      const json = true
      opts = { rpcAddress, json }
      await cancel(args, opts, logger)
      expect(logger.info).to.have.been.calledOnce()
      expect(logger.info).to.have.been.calledWith(JSON.stringify(args))
    })
  })
})
