const path = require('path')
const {
  sinon,
  rewire,
  expect
} = require('test/test-helper')

const programPath = path.resolve('broker-cli', 'sell')
const program = rewire(programPath)

describe('sell', () => {
  let args
  let opts
  let logger
  let revert
  let infoSpy
  let errorSpy
  let createBlockOrderSpy
  let brokerStub

  const sell = program.__get__('sell')

  beforeEach(() => {
    const market = 'BTC/LTC'
    const amount = '10'
    const rpcAddress = undefined
    const timeInForce = 'GTC'

    infoSpy = sinon.spy()
    errorSpy = sinon.spy()
    createBlockOrderSpy = sinon.spy()

    brokerStub = sinon.stub()
    brokerStub.prototype.orderService = { createBlockOrder: createBlockOrderSpy }

    revert = program.__set__('BrokerDaemonClient', brokerStub)

    args = { amount }
    opts = { market, timeInForce, rpcAddress }
    logger = {
      info: infoSpy,
      error: errorSpy
    }
  })

  afterEach(() => {
    revert()
  })

  it('makes a market order request to the broker', () => {
    const expectedRequest = {
      amount: args.amount,
      isMarketOrder: true,
      market: opts.market,
      side: 'ASK',
      timeInForce: opts.timeInForce
    }
    sell(args, opts, logger)
    expect(createBlockOrderSpy).to.have.been.called()
    expect(createBlockOrderSpy).to.have.been.calledWith(expectedRequest)
  })

  it('makes a limit order request to the broker', () => {
    args.price = '10'
    const expectedRequest = {
      amount: args.amount,
      limitPrice: {
        integer: '10',
        decimal: '0'
      },
      market: opts.market,
      side: 'ASK',
      timeInForce: opts.timeInForce
    }
    sell(args, opts, logger)
    expect(createBlockOrderSpy).to.have.been.called()
    expect(createBlockOrderSpy).to.have.been.calledWith(expectedRequest)
  })

  it('converts decimal prices in limit orders', () => {
    args.price = '10.56'
    const expectedRequest = {
      amount: args.amount,
      limitPrice: {
        integer: '10',
        decimal: '56'
      },
      market: opts.market,
      side: 'ASK',
      timeInForce: opts.timeInForce
    }
    sell(args, opts, logger)
    expect(createBlockOrderSpy).to.have.been.called()
    expect(createBlockOrderSpy).to.have.been.calledWith(expectedRequest)
  })
})
