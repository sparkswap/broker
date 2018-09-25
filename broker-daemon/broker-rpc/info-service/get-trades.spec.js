const path = require('path')
const { expect, rewire, sinon } = require('test/test-helper')
const { Big } = require('../../utils')

const getTrades = rewire(path.resolve(__dirname, 'get-trades'))

describe('getTrades', () => {
  let logger
  let GetTradesResponse
  let orderbooks
  let market
  let since
  let limit
  let params
  let orderbookStub
  let trades
  let tradeInfo
  let tradeInfoStub

  beforeEach(() => {
    logger = {
      info: sinon.stub(),
      error: sinon.stub()
    }

    market = 'BTC/LTC'
    since = '2018-09-20T18:58:07.866Z'
    limit = 10

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
    tradeInfoStub = sinon.stub().returns(tradeInfo)

    trades = [{eventType: 'FILLED', tradeInfo: tradeInfoStub}, {eventType: 'PLACED', tradeInfo: tradeInfoStub}]
    orderbookStub = { getTrades: sinon.stub().resolves(trades) }
    orderbooks = new Map([['BTC/LTC', orderbookStub]])
    GetTradesResponse = sinon.stub()
  })

  it('throws if the market is not supported', () => {
    params.market = 'ABC/XYZ'
    return expect(getTrades({ params, logger, orderbooks }, { GetTradesResponse })).to.be.rejectedWith('is not being tracked as a market')
  })

  it('retrieves trades from the orderbook', async () => {
    await getTrades({ params, logger, orderbooks }, { GetTradesResponse })
    expect(orderbookStub.getTrades).to.have.been.calledWith(since, limit)
  })

  it('filters the trades to only filled orders', async () => {
    await getTrades({ params, logger, orderbooks }, { GetTradesResponse })
    expect(tradeInfoStub).to.have.been.calledOnce()
  })

  it('returns trades in the GetTradesResponse', async () => {
    await getTrades({ params, logger, orderbooks }, { GetTradesResponse })
    expect(GetTradesResponse).to.have.been.calledWith({
      trades: [tradeInfo]
    })
  })

  it('sets the limit to the default of 50 if no limit is specified', async () => {
    params.limit = undefined
    await getTrades({ params, logger, orderbooks }, { GetTradesResponse })
    expect(orderbookStub.getTrades).to.have.been.calledWith(since, Big(50))
  })
})
