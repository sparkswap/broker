const {
  expect,
  sinon,
  rewire,
  delay
} = require('test/test-helper')

const path = require('path')
const bigInt = require('big-integer')

const watchMarketPath = path.resolve(__dirname, 'watch-market')
const watchMarket = rewire(watchMarketPath)

describe('watchMarket', () => {
  let store
  let params
  let sendStub
  let logger
  let orderbooks
  let WatchMarketResponse
  let streamFunction
  let liveStream
  let revertFunction

  beforeEach(() => {
    logger = {
      info: sinon.stub()
    }
    params = { market: 'BTC/LTC' }
    sendStub = sinon.stub()
    liveStream = {
      on: sinon.stub()
    }
    store = sinon.stub()
    orderbooks = new Map([['BTC/LTC', { store: store }]])
    WatchMarketResponse = sinon.stub()
    WatchMarketResponse.EventType = { PUT: 'PUT', DEL: 'DEL' }
    streamFunction = sinon.stub().returns(liveStream)
    revertFunction = watchMarket.__set__('streamFunction', streamFunction)
  })

  afterEach(() => {
    revertFunction()
  })

  it('creates a liveStream from the store', () => {
    watchMarket({ params, send: sendStub, logger, orderbooks }, { WatchMarketResponse })

    expect(streamFunction).to.have.been.calledWith(store)
  })

  it('sets an data handler', () => {
    watchMarket({ params, send: sendStub, logger, orderbooks }, { WatchMarketResponse })

    expect(liveStream.on).to.have.been.calledWith('data', sinon.match.func)
  })

  it('sends add events', async () => {
    const fakeOrder = { key: 'key', value: JSON.stringify({ baseAmount: '100', counterAmount: '1000', side: 'BID' }) }
    const marketEvent = {
      orderId: fakeOrder.key,
      baseAmount: bigInt('100').toString(),
      counterAmount: bigInt('1000').toString(),
      side: 'BID'
    }

    liveStream.on.withArgs('data').callsArgWithAsync(1, fakeOrder)

    watchMarket({ params, send: sendStub, logger, orderbooks }, { WatchMarketResponse })

    await delay(10)
    expect(sendStub).to.have.been.calledOnce()
    expect(WatchMarketResponse).to.have.been.calledOnce()
    expect(WatchMarketResponse).to.have.been.calledWith({type: 'PUT', marketEvent: marketEvent})
  })

  it('sends delete events if type is del', async () => {
    const fakeOrder = { key: 'key', type: 'del' }
    const marketEvent = {
      orderId: fakeOrder.key
    }

    liveStream.on.withArgs('data').callsArgWithAsync(1, fakeOrder)

    watchMarket({ params, send: sendStub, logger, orderbooks }, { WatchMarketResponse })

    await delay(10)
    expect(sendStub).to.have.been.calledOnce()
    expect(WatchMarketResponse).to.have.been.calledOnce()
    expect(WatchMarketResponse).to.have.been.calledWith({type: 'DEL', marketEvent: marketEvent})
  })
})
