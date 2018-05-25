const path = require('path')
const {
  sinon,
  rewire,
  expect,
  delay
} = require('test/test-helper')

const programPath = path.resolve('broker-cli', 'orderbook')
const program = rewire(programPath)

describe('orderbook', () => {
  let args
  let opts
  let logger
  let revert
  let infoSpy
  let errorSpy
  let watchMarketStub
  let brokerStub
  let market
  let rpcAddress
  let createUIStub
  let stream

  const orderbook = program.__get__('orderbook')

  beforeEach(() => {
    rpcAddress = undefined
    market = 'BTC/LTC'
    args = {}
    opts = { market, rpcAddress }
    infoSpy = sinon.spy()
    errorSpy = sinon.spy()
    stream = {
      on: sinon.stub()
    }
    watchMarketStub = sinon.stub().returns(stream)
    createUIStub = sinon.stub()

    brokerStub = sinon.stub()
    brokerStub.prototype.watchMarket = watchMarketStub
    brokerStub.prototype.proto = {
      WatchMarketResponse: {
        EventType: { PUT: 'PUT', DEL: 'DEL' }
      }
    }

    revert = program.__set__('BrokerDaemonClient', brokerStub)
    revert = program.__set__('createUI', createUIStub)

    logger = {
      info: infoSpy,
      error: errorSpy
    }
  })

  afterEach(() => {
    revert()
  })

  it('makes a request to the broker', () => {
    orderbook(args, opts, logger)
    expect(watchMarketStub).to.have.been.called()
  })

  it('outputs a UI with orders', async () => {
    await orderbook(args, opts, logger)
    expect(createUIStub).to.have.been.called()
    expect(createUIStub).to.have.been.calledWith(market, [], [])
  })

  it('sets an cancelled handler', async () => {
    await orderbook(args, opts, logger)

    expect(stream.on).to.have.been.calledWith('cancelled', sinon.match.func)
  })

  it('sets an end handler', async () => {
    await orderbook(args, opts, logger)

    expect(stream.on).to.have.been.calledWith('end', sinon.match.func)
  })

  it('sets an data handler', async () => {
    await orderbook(args, opts, logger)

    expect(stream.on).to.have.been.calledWith('data', sinon.match.func)
  })

  it('adds a bid to the UI', async () => {
    const addEvent = { type: 'PUT', marketEvent: { orderId: 'orderId', counterAmount: '1000', baseAmount: '10', side: 'BID' } }
    stream.on.withArgs('data').callsArgWithAsync(1, addEvent)
    orderbook(args, opts, logger)

    await delay(10)

    expect(createUIStub).to.have.been.calledTwice()
    expect(createUIStub).to.have.been.calledWith(market, [], [{ depth: '0.00000010', price: '100.00000000' }])
  })

  it('adds an ask to the UI', async () => {
    const addEvent = { type: 'PUT', marketEvent: { orderId: 'orderId', counterAmount: '1000', baseAmount: '10', side: 'ASK' } }
    stream.on.withArgs('data').callsArgWithAsync(1, addEvent)
    orderbook(args, opts, logger)

    await delay(10)

    expect(createUIStub).to.have.been.calledTwice()
    expect(createUIStub).to.have.been.calledWith(market, [{ depth: '0.00000010', price: '100.00000000' }], [])
  })

  // it('sorts bids and asks by price', async () => {
  //   const firstAsk = { type: 'PUT', marketEvent: { orderId: 'orderId', counterAmount: '10000', baseAmount: '10', side: 'ASK' } }
  //   const secondAsk = { type: 'PUT', marketEvent: { orderId: 'orderId', counterAmount: '1000', baseAmount: '10', side: 'ASK' } }
  //   const firstBid = { type: 'PUT', marketEvent: { orderId: 'orderId', counterAmount: '1000', baseAmount: '10', side: 'BID' } }
  //   const secondBid = { type: 'PUT', marketEvent: { orderId: 'orderId', counterAmount: '10000', baseAmount: '10', side: 'BID' } }
  //
  //   stream.on.withArgs('data').callsArgWithAsync(1, firstAsk)
  //   stream.on.withArgs('data').callsArgWithAsync(1, secondAsk)
  //   stream.on.withArgs('data').callsArgWithAsync(1, firstBid)
  //   stream.on.withArgs('data').callsArgWithAsync(1, secondBid)
  //
  //   orderbook(args, opts, logger)
  //
  //   await delay(100)
  //
  //   expect(createUIStub).to.have.been.calledWith(market, [{ baseAmount: '10', counterAmount: '10000' }], [])
  // })

  // it('deletes bids or asks on delete events coming from the broker daemon', async () => {
  //   await orderbook(args, opts, logger)
  //   expect(createUIStub).to.have.been.called()
  //   expect(createUIStub).to.have.been.calledWith(market, [], [])
  // })

  // watchOrder.on('cancelled', () => logger.info('Stream was cancelled by the server'))
  // watchOrder.on('end', () => logger.info('End of stream'))

  // it('makes a request to the broker', () => {
  //   orderbook(args, opts, logger)
  //   expect(healthCheckSpy).to.have.been.called()
  // })
})
