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

    getBlockOrderStub = sinon.stub().returns({ blockOrder: 'blockOrder' })
    daemonStub = sinon.stub()
    daemonStub.prototype.orderService = { getBlockOrder: getBlockOrderStub }

    status.__set__('BrokerDaemonClient', daemonStub)
  })

  it('calls broker daemon for the order status', () => {
    status(args, opts, logger)
    expect(daemonStub).to.have.been.calledWith(rpcAddress)
    expect(getBlockOrderStub).to.have.been.calledOnce()
  })

  describe('with json output', async () => {
    it('logs order status', async () => {
      const json = true
      opts = { rpcAddress, json }
      await status(args, opts, logger)
      expect(logger.info).to.have.been.calledOnce()
      expect(logger.info).to.have.been.calledWith(JSON.stringify({ blockOrder: 'blockOrder' }))
    })
  })
})
