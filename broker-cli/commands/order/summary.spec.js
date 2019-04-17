const path = require('path')
const {
  sinon,
  rewire,
  expect
} = require('test/test-helper')

const programPath = path.resolve(__dirname, 'summary')
const program = rewire(programPath)

describe('summary', () => {
  let args
  let opts
  let logger
  let revert
  let infoSpy
  let errorSpy
  let getBlockOrdersStub
  let brokerStub
  let market
  let rpcAddress
  let order
  let tableStub
  let revertTable
  let instanceTableStub

  const summary = program.__get__('summary')

  beforeEach(() => {
    rpcAddress = undefined
    market = 'BTC/LTC'
    args = {}
    opts = { market, rpcAddress }
    infoSpy = sinon.spy()
    errorSpy = sinon.spy()
    order = {
      side: 'BID',
      amount: '1000',
      limitPrice: '10',
      isMarketOrder: false,
      timeInForce: 'GTC',
      blockOrderId: 'asdfasdf',
      status: 'FAILED',
      datetime: '2019-04-12T23:21:42.2744494Z'
    }
    getBlockOrdersStub = sinon.stub().resolves({ blockOrders: [order] })

    brokerStub = sinon.stub()
    brokerStub.prototype.orderService = { getBlockOrders: getBlockOrdersStub }
    instanceTableStub = { push: sinon.stub() }
    tableStub = sinon.stub().returns(instanceTableStub)
    revert = program.__set__('BrokerDaemonClient', brokerStub)
    revertTable = program.__set__('Table', tableStub)

    logger = {
      info: infoSpy,
      error: errorSpy
    }
  })

  afterEach(() => {
    revert()
    revertTable()
  })

  it('makes a request to the broker', async () => {
    await summary(args, opts, logger)
    expect(getBlockOrdersStub).to.have.been.calledWith({ market })
  })

  it('adds orders to the table', async () => {
    await summary(args, opts, logger)

    expect(instanceTableStub.push).to.have.been.called()
    expect(instanceTableStub.push).to.have.been.calledWith([order.blockOrderId, order.status, order.side.green, order.amount, order.limitPrice, order.timeInForce, '2019-04-12T23:21:42.274Z'])
  })

  it('uses MARKET as price if there is no price', async () => {
    const order = {
      side: 'BID',
      amount: '1000',
      limitPrice: '0',
      isMarketOrder: true,
      timeInForce: 'GTC',
      blockOrderId: 'asdfasdf',
      status: 'FAILED',
      datetime: '2019-04-12T23:21:42.2744494Z'
    }
    brokerStub.prototype.orderService = { getBlockOrders: sinon.stub().resolves({ blockOrders: [order] }) }
    await summary(args, opts, logger)

    expect(instanceTableStub.push).to.have.been.called()
    expect(instanceTableStub.push).to.have.been.calledWith([order.blockOrderId, order.status, order.side.green, order.amount, 'MARKET', order.timeInForce, '2019-04-12T23:21:42.274Z'])
  })
})
