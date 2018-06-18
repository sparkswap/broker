const {
  expect,
  sinon,
  rewire,
  delay
} = require('test/test-helper')

const path = require('path')

const watchMarketPath = path.resolve(__dirname, 'watch-market')
const watchMarket = rewire(watchMarketPath)

describe('watchMarket', () => {
  let store
  let params
  let sendStub
  let onCancelStub
  let onErrorStub
  let logger
  let orderbooks
  let WatchMarketResponse
  let createLiveStream
  let liveStream
  let revertFunction

  beforeEach(() => {
    logger = {
      info: sinon.stub()
    }
    params = { market: 'BTC/LTC' }
    sendStub = sinon.stub()
    onCancelStub = sinon.stub()
    onErrorStub = sinon.stub()
    liveStream = {
      on: sinon.stub(),
      removeListener: sinon.stub()
    }
    store = sinon.stub()
    orderbooks = new Map([['BTC/LTC', { store: store }]])
    WatchMarketResponse = sinon.stub()
    WatchMarketResponse.EventType = { ADD: 'ADD', DELETE: 'DELETE' }
    createLiveStream = sinon.stub().returns(liveStream)
    revertFunction = watchMarket.__set__('createLiveStream', createLiveStream)
  })

  afterEach(() => {
    revertFunction()
  })

  it('throws if there is no orderbook', () => {
    params.market = 'ABC/XYZ'

    return expect(watchMarket({ params, send: sendStub, onCancel: onCancelStub, onError: onErrorStub, logger, orderbooks }, { WatchMarketResponse })).to.eventually.be.rejectedWith('not being tracked as a market')
  })

  it('creates a liveStream from the store', () => {
    watchMarket({ params, send: sendStub, onCancel: onCancelStub, onError: onErrorStub, logger, orderbooks }, { WatchMarketResponse })

    expect(createLiveStream).to.have.been.calledWith(store)
  })

  it('stops sending data if the stream is cancelled', () => {
    watchMarket({ params, send: sendStub, onCancel: onCancelStub, onError: onErrorStub, logger, orderbooks }, { WatchMarketResponse })

    onCancelStub.args[0][0]()

    expect(liveStream.removeListener).to.have.been.calledOnce()
    expect(liveStream.removeListener).to.have.been.calledWith('data', sinon.match.func)
  })

  it('stops sending data if the stream errors', () => {
    watchMarket({ params, send: sendStub, onCancel: onCancelStub, onError: onErrorStub, logger, orderbooks }, { WatchMarketResponse })

    onErrorStub.args[0][0]()

    expect(liveStream.removeListener).to.have.been.calledOnce()
    expect(liveStream.removeListener).to.have.been.calledWith('data', sinon.match.func)
  })

  it('sets an data handler', () => {
    watchMarket({ params, send: sendStub, onCancel: onCancelStub, onError: onErrorStub, logger, orderbooks }, { WatchMarketResponse })

    expect(liveStream.on).to.have.been.calledWith('data', sinon.match.func)
  })

  it('sends add events', async () => {
    const fakeOrder = { key: 'key', value: JSON.stringify({ baseAmount: '100', counterAmount: '1000', side: 'BID' }) }
    const marketEvent = {
      orderId: fakeOrder.key,
      price: '10.0000000000000000',
      amount: '0.0000000100000000'
      side: 'BID'
    }

    liveStream.on.withArgs('data').callsArgWithAsync(1, fakeOrder)

    watchMarket({ params, send: sendStub, onCancel: onCancelStub, onError: onErrorStub, logger, orderbooks }, { WatchMarketResponse })

    await delay(10)
    expect(sendStub).to.have.been.calledOnce()
    expect(WatchMarketResponse).to.have.been.calledOnce()
    expect(WatchMarketResponse).to.have.been.calledWith({type: 'ADD', marketEvent: marketEvent})
  })

  it('sends delete events if type is del', async () => {
    const fakeOrder = { key: 'key', type: 'del' }
    const marketEvent = {
      orderId: fakeOrder.key
    }

    liveStream.on.withArgs('data').callsArgWithAsync(1, fakeOrder)

    watchMarket({ params, send: sendStub, onCancel: onCancelStub, onError: onErrorStub, logger, orderbooks }, { WatchMarketResponse })

    await delay(10)
    expect(sendStub).to.have.been.calledOnce()
    expect(WatchMarketResponse).to.have.been.calledOnce()
    expect(WatchMarketResponse).to.have.been.calledWith({type: 'DELETE', marketEvent: marketEvent})
  })
})
