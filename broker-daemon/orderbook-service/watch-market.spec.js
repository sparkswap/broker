const {
  chai,
  sinon,
  rewire
} = require('test/test-helper')

const path = require('path')
const bigInt = require('big-integer')

const { expect } = chai
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
  let neverResolveStub
  let revertNeverResolve

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
    streamFunction = sinon.stub().returns(liveStream)
    neverResolveStub = sinon.stub().returns(Promise.resolve())
    revertFunction = watchMarket.__set__('streamFunction', streamFunction)
    revertNeverResolve = watchMarket.__set__('neverResolve', neverResolveStub)
  })

  afterEach(() => {
    revertFunction()
    revertNeverResolve()
  })

  it('creates a liveStream from the store', () => {
    watchMarket({ params, send: sendStub, logger, orderbooks }, { WatchMarketResponse })

    expect(streamFunction).to.have.been.calledWith(store)
  })

  it('sets an data handler', () => {
    watchMarket({ params, send: sendStub, logger, orderbooks }, { WatchMarketResponse })

    expect(liveStream.on).to.have.been.calledWith('data', sinon.match.func)
  })

  it('processes records through eachRecord', async () => {
    const fakeOrder = { key: 'key', value: JSON.stringify({ baseAmount: '100', counterAmount: '1000', side: 'BID' }) }

    liveStream.on.withArgs('data').callsArgWithAsync(1, fakeOrder)

    await watchMarket({ params, send: sendStub, logger, orderbooks }, { WatchMarketResponse })

    expect(sendStub).to.have.been.calledOnce()
    expect(WatchMarketResponse).to.have.been.calledOnce()
    expect(WatchMarketResponse).to.have.been.calledWith(sinon.match(bigInt('100'), bigInt('1000'), 'BID'))

    neverResolveStub()
  })
})
