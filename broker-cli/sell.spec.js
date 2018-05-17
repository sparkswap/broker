const path = require('path')
const {
  chai,
  sinon,
  rewire
} = require('test/test-helper')

const { expect } = chai
const programPath = path.resolve('broker-cli', 'sell')
const program = rewire(programPath)

describe('sell', () => {
  let args
  let opts
  let logger
  let revert
  let infoSpy
  let errorSpy
  let createOrderSpy
  let brokerStub

  const sell = program.__get__('sell')

  beforeEach(() => {
    const market = 'BTC/LTC'
    const amount = '10'
    const rpcAddress = undefined
    const timeinforce = 'GTC'

    infoSpy = sinon.spy()
    errorSpy = sinon.spy()
    createOrderSpy = sinon.spy()

    brokerStub = sinon.stub()
    brokerStub.prototype.createOrder = createOrderSpy

    revert = program.__set__('BrokerDaemonClient', brokerStub)

    args = { amount }
    opts = { market, timeinforce, rpcAddress }
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
      timeinforce: opts.timeinforce,
      market: opts.market,
      side: 'SELL'
    }
    sell(args, opts, logger)
    expect(createOrderSpy).to.have.been.called()
    expect(createOrderSpy).to.have.been.calledWith(expectedRequest)
  })
})
