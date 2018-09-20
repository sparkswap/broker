const path = require('path')
const { expect, rewire, sinon } = require('test/test-helper')

const getOrderbook = rewire(path.resolve(__dirname, 'get-orderbook'))

describe('getOrderbook', () => {
  let market
  let orders
  let orderbook
  let orderbooks
  let nanoToDatetimeStub
  let GetOrderbookResponse
  let params
  let logger
  let revertDateStub
  let dateStub

  beforeEach(() => {
    market = 'BTC/LTC'
    params = { market }
    orders = [
      {side: 'BID', price: '0.001', amount: '0.003', createdAt: '123123123'},
      {side: 'ASK', price: '0.0031', amount: '0.0004', createdAt: '234234234234'},
      {side: 'ASK', price: '0.005', amount: '0.0001', createdAt: '4564564574543'}

    ]
    orderbook = { all: sinon.stub().resolves(orders) }
    logger = {
      info: sinon.stub(),
      error: sinon.stub()
    }
    orderbooks = new Map([['BTC/LTC', orderbook]])
    nanoToDatetimeStub = sinon.stub().returns('2018-09-20T18:07:06.225Z')
    getOrderbook.__set__('nanoToDatetime', nanoToDatetimeStub)
    dateStub = sinon.stub()
    dateStub.prototype.getTime = sinon.stub().returns('123123123')
    revertDateStub = getOrderbook.__set__('Date', dateStub)
    GetOrderbookResponse = sinon.stub()
  })

  afterEach(() => {
    revertDateStub()
  })

  it('throws an error if the orderbook for the specified market cannot be found', () => {
    const badOrderbooks = new Map()
    return expect(getOrderbook({ params, logger, orderbooks: badOrderbooks }, { GetOrderbookResponse })).to.eventually.be.rejectedWith(`${market} is not being tracked as a market.`)
  })

  it('gets all orders from the orderbook', async () => {
    await getOrderbook({ params, logger, orderbooks }, { GetOrderbookResponse })

    expect(orderbook.all).to.have.been.calledOnce()
  })

  it('converts the createdAt timestamp from nanoseconds a ISO string', async () => {
    await getOrderbook({ params, logger, orderbooks }, { GetOrderbookResponse })

    expect(nanoToDatetimeStub).to.have.been.calledWith('4564564574543')
  })

  it('returns bids, asks, timestamp and datetime', async () => {
    await getOrderbook({ params, logger, orderbooks }, { GetOrderbookResponse })

    expect(GetOrderbookResponse).to.have.been.calledOnce()
    expect(GetOrderbookResponse).to.have.been.calledWith(
      { bids: [{price: '0.001', amount: '0.003'}],
        asks: [{price: '0.0031', amount: '0.0004'}, {price: '0.005', amount: '0.0001'}],
        datetime: '2018-09-20T18:07:06.225Z',
        timestamp: '123123123' }
    )
  })
})
