const path = require('path')
const { expect, rewire, sinon } = require('test/test-helper')

const getOrderbook = rewire(path.resolve(__dirname, 'get-orderbook'))

describe('getOrderbook', () => {
  let market
  let orders
  let orderbook
  let orderbooks
  let GetOrderbookResponse
  let params
  let logger
  let nanoStub
  let nowStub
  let toStringStub
  let toISOString

  beforeEach(() => {
    market = 'BTC/LTC'
    params = { market }
    orders = [
      {side: 'BID', price: '0.001', amount: '0.003'},
      {side: 'ASK', price: '0.0031', amount: '0.0004'},
      {side: 'ASK', price: '0.005', amount: '0.0001'}

    ]
    orderbook = { all: sinon.stub().resolves(orders) }
    logger = {
      info: sinon.stub(),
      error: sinon.stub()
    }
    orderbooks = new Map([['BTC/LTC', orderbook]])
    nowStub = sinon.stub().returns([ 1537487044, 158465755 ])
    toStringStub = sinon.stub().withArgs([ 1537487044, 158465755 ]).returns('1537487471431784972')
    toISOString = sinon.stub().withArgs([ 1537487044, 158465755 ]).returns('2018-09-20T23:51:11.431784972Z')

    nanoStub = { now: nowStub, toString: toStringStub, toISOString: toISOString }
    getOrderbook.__set__('nano', nanoStub)
    GetOrderbookResponse = sinon.stub()
  })

  it('throws an error if the orderbook for the specified market cannot be found', () => {
    const badOrderbooks = new Map()
    return expect(getOrderbook({ params, logger, orderbooks: badOrderbooks }, { GetOrderbookResponse })).to.eventually.be.rejectedWith(`${market} is not being tracked as a market.`)
  })

  it('gets all orders from the orderbook', async () => {
    await getOrderbook({ params, logger, orderbooks }, { GetOrderbookResponse })

    expect(orderbook.all).to.have.been.calledOnce()
  })

  it('converts the current time to nanoseconds', async () => {
    await getOrderbook({ params, logger, orderbooks }, { GetOrderbookResponse })
    expect(nanoStub.now).to.have.been.calledOnce()
  })

  it('converts the time in nanoseconds to a string', async () => {
    await getOrderbook({ params, logger, orderbooks }, { GetOrderbookResponse })
    expect(nanoStub.toString).to.have.been.calledWith([ 1537487044, 158465755 ])
  })

  it('converts the time in nanoseconds to an ISO string', async () => {
    await getOrderbook({ params, logger, orderbooks }, { GetOrderbookResponse })
    expect(nanoStub.toISOString).to.have.been.calledWith([ 1537487044, 158465755 ])
  })

  it('returns bids, asks, timestamp and datetime', async () => {
    await getOrderbook({ params, logger, orderbooks }, { GetOrderbookResponse })

    expect(GetOrderbookResponse).to.have.been.calledOnce()
    expect(GetOrderbookResponse).to.have.been.calledWith(
      { bids: [{price: '0.001', amount: '0.003'}],
        asks: [{price: '0.0031', amount: '0.0004'}, {price: '0.005', amount: '0.0001'}],
        datetime: '2018-09-20T23:51:11.431784972Z',
        timestamp: '1537487471431784972' }
    )
  })

  it('limits the number of orders', async () => {
    orders = [
      {side: 'BID', price: '0.0017', amount: '0.003'},
      {side: 'BID', price: '0.0018', amount: '0.003'},
      {side: 'BID', price: '0.0019', amount: '0.003'},
      {side: 'BID', price: '0.002', amount: '0.003'},
      {side: 'BID', price: '0.0021', amount: '0.003'},
      {side: 'ASK', price: '0.003', amount: '0.0004'},
      {side: 'ASK', price: '0.0031', amount: '0.0004'},
      {side: 'ASK', price: '0.0032', amount: '0.0004'},
      {side: 'ASK', price: '0.0033', amount: '0.0004'},
      {side: 'ASK', price: '0.0034', amount: '0.0004'}
    ]

    orderbook = { all: sinon.stub().resolves(orders) }
    orderbooks = new Map([['BTC/LTC', orderbook]])
    params.limit = 3
    await getOrderbook({ params, logger, orderbooks }, { GetOrderbookResponse })

    expect(GetOrderbookResponse).to.have.been.calledWith(
      {
        bids: [
          {price: '0.0021', amount: '0.003'},
          {price: '0.002', amount: '0.003'},
          {price: '0.0019', amount: '0.003'}
        ],
        asks: [
          {price: '0.003', amount: '0.0004'},
          {price: '0.0031', amount: '0.0004'},
          {price: '0.0032', amount: '0.0004'}
        ],
        datetime: '2018-09-20T23:51:11.431784972Z',
        timestamp: '1537487471431784972'
      }
    )
  })
})
