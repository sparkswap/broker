const path = require('path')
const {
  sinon,
  rewire,
  expect
} = require('test/test-helper')

const programPath = path.resolve(__dirname, 'buy')
const program = rewire(programPath)

describe('buy', () => {
  let args
  let opts
  let logger
  let revert
  let infoSpy
  let errorSpy
  let createBlockOrderSpy
  let brokerStub

  const market = 'BTC/LTC'
  const amount = '10'
  const price = '10'
  const rpcAddress = undefined
  const timeInForce = 'GTC'
  const buy = program.__get__('buy')

  beforeEach(() => {
    infoSpy = sinon.spy()
    errorSpy = sinon.spy()
    createBlockOrderSpy = sinon.spy()

    brokerStub = sinon.stub()
    brokerStub.prototype.orderService = {
      createBlockOrder: createBlockOrderSpy
    }

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

  it('makes a market order request to the broker', () => {
    delete args.price
    const expectedRequest = {
      amount: args.amount,
      isMarketOrder: true,
      timeInForce: opts.timeInForce,
      market: opts.market,
      side: 'BID'
    }
    buy(args, opts, logger)
    expect(createBlockOrderSpy).to.have.been.called()
    expect(createBlockOrderSpy).to.have.been.calledWith(expectedRequest)
  })

  it('makes a limit order request to the broker', () => {
    const expectedRequest = {
      amount: args.amount,
      limitPrice: args.price,
      market: opts.market,
      side: 'BID',
      timeInForce: opts.timeInForce
    }
    buy(args, opts, logger)
    expect(createBlockOrderSpy).to.have.been.called()
    expect(createBlockOrderSpy).to.have.been.calledWith(expectedRequest)
  })

  it('allows decimal prices in limit orders', () => {
    args.price = '10.56'
    const expectedRequest = {
      amount: args.amount,
      limitPrice: args.price,
      market: opts.market,
      side: 'BID',
      timeInForce: opts.timeInForce
    }
    buy(args, opts, logger)
    expect(createBlockOrderSpy).to.have.been.called()
    expect(createBlockOrderSpy).to.have.been.calledWith(expectedRequest)
  })

  describe('with json output', () => {
    it('logs buy result', async () => {
      const json = true
      opts = { market, timeInForce, rpcAddress, json }
      await buy(args, opts, logger)
      expect(infoSpy).to.have.been.calledOnce()
    })
  })
})
