const { sinon, expect } = require('test/test-helper')

const watchMarket = require('./watch-market')

describe('watchMarket', () => {
  let params
  let sendStub
  let logger
  let orderbooks
  let orderbookStub
  let fakeOrder
  let fakeOrder2
  let WatchMarketResponse

  beforeEach(() => {
    params = { market: 'BTC/LTC' }
    sendStub = sinon.stub()
    logger = { error: sinon.stub() }
    fakeOrder = { baseAmount: '100', counterAmount: '1000', side: 'BID' }
    fakeOrder2 = { baseAmount: '200', counterAmount: '1000', side: 'BID' }
    orderbookStub = sinon.stub().callsFake(() => [fakeOrder, fakeOrder2])
    orderbooks = { 'BTC/LTC': { all: orderbookStub } }
    WatchMarketResponse = sinon.stub()
  })

  it('grabs records from the orderbook', async () => {
    await watchMarket({ params, send: sendStub, logger, orderbooks }, { WatchMarketResponse })
    expect(orderbookStub).to.have.been.called()
  })

  it('returns orders to the cli', async () => {
    await watchMarket({ params, send: sendStub, logger, orderbooks }, { WatchMarketResponse })
    expect(WatchMarketResponse).to.have.been.calledTwice()
    expect(WatchMarketResponse).to.have.been.calledWith(sinon.match(parseFloat(fakeOrder.baseAmount), parseFloat(fakeOrder.counterAmount), fakeOrder.side))
    expect(WatchMarketResponse).to.have.been.calledWith(sinon.match(parseFloat(fakeOrder2.baseAmount), parseFloat(fakeOrder2.counterAmount), fakeOrder2.side))
  })
})
