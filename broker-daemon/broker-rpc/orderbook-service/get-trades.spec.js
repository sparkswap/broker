const path = require('path')
const { expect, rewire, sinon } = require('test/test-helper')
const { Big } = require('../../utils')

const getTrades = rewire(path.resolve(__dirname, 'get-trades'))

describe('getTrades', () => {
  let logger
  let orderbooks
  let market
  let since
  let limit
  let params
  let orderbookStub
  let trades
  let tradeInfo
  let placedTradeInfoStub
  let filledTradeInfoStub

  beforeEach(() => {
    logger = {
      info: sinon.stub(),
      error: sinon.stub()
    }

    market = 'BTC/LTC'
    since = '2018-09-20T18:58:07.866Z'
    limit = '10'

    params = {
      market,
      since,
      limit
    }
    tradeInfo = { id: 'yK2LMkgQPZRk1riK9pgwIyVjr7xMFOgn0iCF6FPm',
      timestamp: '1537526431834233900',
      datetime: '2018-09-21T10:40:31.0342339Z',
      order: 'tgjXZ6Mr_xcRzjMZ4xUkNnUpHL7OuJvBbFGG-CTg',
      symbol: 'BTC/LTC',
      type: 'limit',
      side: 'buy',
      price: '0.0010000000000000',
      amount: '400.000000000000' }
    filledTradeInfoStub = sinon.stub().returns(tradeInfo)
    placedTradeInfoStub = sinon.stub().returns({})

    trades = [{ eventType: 'FILLED', tradeInfo: filledTradeInfoStub }, { eventType: 'PLACED', tradeInfo: placedTradeInfoStub }]
    orderbookStub = { getTrades: sinon.stub().resolves(trades) }
    orderbooks = new Map([['BTC/LTC', orderbookStub]])
  })

  it('throws if the market is not supported', () => {
    params.market = 'ABC/XYZ'
    return expect(getTrades({ params, logger, orderbooks })).to.be.rejectedWith('is not being tracked as a market')
  })

  it('retrieves trades from the orderbook', async () => {
    await getTrades({ params, logger, orderbooks })
    expect(orderbookStub.getTrades).to.have.been.calledWith(since, Big(limit))
  })

  it('filters the trades to only filled orders', async () => {
    await getTrades({ params, logger, orderbooks })
    expect(filledTradeInfoStub).to.have.been.calledOnce()
    expect(placedTradeInfoStub).to.not.have.been.called()
  })

  it('returns trades in the GetTradesResponse', async () => {
    const res = await getTrades({ params, logger, orderbooks })
    expect(res).to.be.eql({
      trades: [tradeInfo]
    })
  })

  it('sets the limit to the default of 50 if no limit is specified', async () => {
    // '0' is the default protobuf value when no limit is provided
    params.limit = '0'
    await getTrades({ params, logger, orderbooks })
    expect(orderbookStub.getTrades).to.have.been.calledWith(since, Big(50))
  })
})
