const path = require('path')
const {
  sinon,
  rewire,
  expect
} = require('test/test-helper')

const programPath = path.resolve('broker-cli', 'buy')
const program = rewire(programPath)

describe('buy', () => {
  let args
  let opts
  let logger
  let revert
  let infoSpy
  let errorSpy
  let createOrderSpy
  let brokerStub

  const buy = program.__get__('buy')

  beforeEach(() => {
    const market = 'BTC/LTC'
    const amount = '10'
    const price = '10'
    const rpcAddress = undefined
    const timeInForce = 'GTC'

    infoSpy = sinon.spy()
    errorSpy = sinon.spy()
    createOrderSpy = sinon.spy()

    brokerStub = sinon.stub()
    brokerStub.prototype.createOrder = createOrderSpy

    revert = program.__set__('BrokerDaemonClient', brokerStub)

    args = { amount, price }
    opts = { market, timeInForce, rpcAddress }
    logger = {
      info: infoSpy,
      error: errorSpy
    }
  })

  afterEach(() => {
    revert()
  })

  it('makes a request to the broker', () => {
    const expectedRequest = {
      amount: args.amount,
      price: args.price,
      timeInForce: opts.timeInForce,
      market: opts.market,
      side: 'BID'
    }
    buy(args, opts, logger)
    expect(createOrderSpy).to.have.been.called()
    expect(createOrderSpy).to.have.been.calledWith(expectedRequest)
  })
})
