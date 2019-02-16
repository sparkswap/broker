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
  let askQuestionStub
  let revert

  beforeEach(() => {
    rpcAddress = 'test:1337'
    market = 'BTC/LTC'
    opts = {
      rpcAddress,
      market
    }
    logger = { info: sinon.stub(), error: sinon.stub() }

    cancelAllBlockOrdersStub = sinon.stub().resolves({
      cancelledOrders: ['adsfasdf'],
      failedToCancelOrders: ['treedfg']
    })
    daemonStub = sinon.stub()
    daemonStub.prototype.orderService = { cancelAllBlockOrders: cancelAllBlockOrdersStub }
    askQuestionStub = sinon.stub().resolves('y')
    revert = []
    revert.push(cancelAll.__set__('BrokerDaemonClient', daemonStub))
    revert.push(cancelAll.__set__('askQuestion', askQuestionStub))
  })

  afterEach(() => {
    revert.forEach(r => r())
  })

  it('asks the user to confirm the cancellation', async () => {
    await cancelAll(args, opts, logger)

    expect(askQuestionStub).to.have.been.calledWith(`Are you sure you want to cancel all your orders on the ${market} market? (Y/N)`)
  })

  it('does not cancel order if user answers no', async () => {
    askQuestionStub.resolves('n')

    await cancelAll(args, opts, logger)
    expect(cancelAllBlockOrdersStub).to.not.have.been.called()
  })

  it('calls broker daemon for the order cancel', async () => {
    await cancelAll(args, opts, logger)

    expect(daemonStub).to.have.been.calledWith(rpcAddress)
  })

  it('logs the results of cancelling the orders when all orders successfully cancel', async () => {
    cancelAllBlockOrdersStub = sinon.stub().resolves({
      cancelledOrders: ['adsfasdf']
    })
    daemonStub = sinon.stub()
    daemonStub.prototype.orderService = { cancelAllBlockOrders: cancelAllBlockOrdersStub }
    cancelAll.__set__('BrokerDaemonClient', daemonStub)
    await cancelAll(args, opts, logger)
    expect(logger.info).to.have.been.calledWith(`Succesfully cancelled 1 orders on ${market} market.`)
  })

  it('logs the results of cancelling the orders', async () => {
    await cancelAll(args, opts, logger)
    expect(logger.info).to.have.been.calledWith(
      `Succesfully cancelled 1 orders on ${market} market.` +
      `\nUnable to cancel 1 orders on ${market} market.` +
      ' Check your Broker Daemon logs (`docker-compose logs -f sparkswapd`) for more information.'
    )
  })
})
