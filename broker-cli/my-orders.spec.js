const path = require('path')
const {
  sinon,
  rewire,
  expect
} = require('test/test-helper')

const programPath = path.resolve('broker-cli', 'my-orders')
const program = rewire(programPath)

describe('myOrders', () => {
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
  let createUIStub
  let revertCreateUI
  let order

  const myOrders = program.__get__('myOrders')

  beforeEach(() => {
    rpcAddress = undefined
    market = 'BTC/LTC'
    args = {}
    opts = { market, rpcAddress }
    infoSpy = sinon.spy()
    errorSpy = sinon.spy()
    order = {
      side: 'BID',
      amount: 1000,
      price: 10,
      timeInForce: 'GTC',
      blockOrderId: 'asdfasdf',
      status: 'FAILED'
    }
    getBlockOrdersStub = sinon.stub().resolves({blockOrders: [order]})
    createUIStub = sinon.stub()

    brokerStub = sinon.stub()
    brokerStub.prototype.orderService = { getBlockOrders: getBlockOrdersStub }

    revert = program.__set__('BrokerDaemonClient', brokerStub)
    revertCreateUI = program.__set__('createUI', createUIStub)

    logger = {
      info: infoSpy,
      error: errorSpy
    }
  })

  afterEach(() => {
    revert()
    revertCreateUI()
  })

  it('makes a request to the broker', async () => {
    await myOrders(args, opts, logger)
    expect(getBlockOrdersStub).to.have.been.calledWith({market})
  })

  it('outputs a UI with orders', async () => {
    await myOrders(args, opts, logger)
    expect(createUIStub).to.have.been.called()
    expect(createUIStub).to.have.been.calledWith(market, [order])
  })
})
