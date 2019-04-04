const path = require('path')
const {
  sinon,
  rewire,
  expect,
  delay
} = require('test/test-helper')

const programPath = path.resolve(__dirname, 'orderbook')
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
  let revertCreateUI
  let resizeHandleStub
  let revertProcessStub

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
    brokerStub.prototype.orderBookService = { watchMarket: watchMarketStub }

    revert = program.__set__('BrokerDaemonClient', brokerStub)
    revertCreateUI = program.__set__('createUI', createUIStub)

    logger = {
      info: infoSpy,
      error: errorSpy
    }

    resizeHandleStub = sinon.stub()
    revertProcessStub = program.__set__('process', { stdout: { on: resizeHandleStub } })
  })

  afterEach(() => {
    revert()
    revertCreateUI()
    revertProcessStub()
  })

  it('makes a request to the broker', async () => {
    await orderbook(args, opts, logger)
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

  it('sets a data handler', async () => {
    await orderbook(args, opts, logger)

    expect(stream.on).to.have.been.calledWith('data', sinon.match.func)
  })

  it('adds a bid to the UI', async () => {
    const addEvent = { type: 'ADD', marketEvent: { orderId: 'orderId', price: '100.0000000000000000', amount: '0.0000000100000000', side: 'BID' } }
    stream.on.withArgs('data').callsArgWithAsync(1, addEvent)
    orderbook(args, opts, logger)

    await delay(10)

    expect(createUIStub).to.have.been.calledTwice()
    expect(createUIStub).to.have.been.calledWith(market, [], [{ amount: '0.0000000100000000', price: '100.0000000000000000' }])
  })

  it('adds a bid with a large counter amount', async () => {
    const addEvent = { type: 'ADD', marketEvent: { orderId: 'orderId', price: '1000000.0000000000000000', amount: '0.0000000100000000', side: 'BID' } }
    stream.on.withArgs('data').callsArgWithAsync(1, addEvent)
    orderbook(args, opts, logger)

    await delay(10)

    expect(createUIStub).to.have.been.calledWith(market, [], [{ price: '1000000.0000000000000000', amount: '0.0000000100000000' }])
  })

  it('adds an ask to the UI', async () => {
    const addEvent = { type: 'ADD', marketEvent: { orderId: 'orderId', price: '100.0000000000000000', amount: '0.0000000100000000', side: 'ASK' } }
    stream.on.withArgs('data').callsArgWithAsync(1, addEvent)
    orderbook(args, opts, logger)

    await delay(10)

    expect(createUIStub).to.have.been.calledTwice()
    expect(createUIStub).to.have.been.calledWith(market, [{ price: '100.0000000000000000', amount: '0.0000000100000000' }], [])
  })

  it('sorts bids and asks by price', async () => {
    const firstAsk = { type: 'ADD', marketEvent: { orderId: 'orderId', price: '1000.0000000000000000', amount: '0.0000000100000000', side: 'ASK' } }
    const secondAsk = { type: 'ADD', marketEvent: { orderId: 'orderId2', price: '100.0000000000000000', amount: '0.0000000100000000', side: 'ASK' } }
    const firstBid = { type: 'ADD', marketEvent: { orderId: 'orderId3', price: '1000.0000000000000000', amount: '0.0000000100000000', side: 'BID' } }
    const secondBid = { type: 'ADD', marketEvent: { orderId: 'orderId4', price: '100.0000000000000000', amount: '0.0000000100000000', side: 'BID' } }

    stream.on.withArgs('data').callsFake(async (evt, fn) => {
      await delay(10)
      fn(firstAsk)
      await delay(10)
      fn(secondAsk)
      await delay(10)
      fn(firstBid)
      await delay(10)
      fn(secondBid)
    })

    orderbook(args, opts, logger)

    await delay(100)

    expect(createUIStub).to.have.been.calledWith(
      market, [
        { price: '100.0000000000000000', amount: '0.0000000100000000' },
        { price: '1000.0000000000000000', amount: '0.0000000100000000' }
      ], [
        { price: '1000.0000000000000000', amount: '0.0000000100000000' },
        { price: '100.0000000000000000', amount: '0.0000000100000000' }
      ])
  })

  it('deletes bids or asks on delete events coming from the broker daemon', async () => {
    const firstAsk = { type: 'ADD', marketEvent: { orderId: 'orderId', price: '100.0000000000000000', amount: '0.0000000100000000', side: 'ASK' } }
    const secondAsk = { type: 'ADD', marketEvent: { orderId: 'orderId2', price: '1000.0000000000000000', amount: '0.0000000100000000', side: 'ASK' } }
    const deleteFirstAsk = { type: 'DELETE', marketEvent: { orderId: 'orderId' } }

    stream.on.withArgs('data').callsFake(async (evt, fn) => {
      await delay(10)
      fn(firstAsk)
      await delay(10)
      fn(secondAsk)
      await delay(10)
      fn(deleteFirstAsk)
    })

    orderbook(args, opts, logger)

    await delay(100)

    expect(createUIStub).to.have.been.calledWith(market, [], [])
    expect(createUIStub).to.have.been.calledWith(market, [{ price: '100.0000000000000000', amount: '0.0000000100000000' }], [])
    expect(createUIStub).to.have.been.calledWith(market, [{ price: '100.0000000000000000', amount: '0.0000000100000000' }, { price: '1000.0000000000000000', amount: '0.0000000100000000' }], [])
    expect(createUIStub).to.have.been.calledWith(market, [{ price: '1000.0000000000000000', amount: '0.0000000100000000' }], [])
  })

  it('sets a resize event handler that results in recreating the UI', async () => {
    await orderbook(args, opts, logger)

    expect(resizeHandleStub).to.have.been.calledWith('resize', sinon.match.func)
  })
})
