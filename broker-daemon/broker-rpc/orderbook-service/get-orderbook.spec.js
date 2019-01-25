const path = require('path')
const { expect, rewire, sinon } = require('test/test-helper')

const getOrderbook = rewire(path.resolve(__dirname, 'get-orderbook'))

describe('getOrderbook', () => {
  let market
  let defaultProtobufValue
  let DEFAULT_LIMIT
  let bids
  let asks
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
    // Default value when no limitPerSide is provided to RPC GetOrderbookRequest is '0'
    defaultProtobufValue = '0'
    DEFAULT_LIMIT = '50'
    params = { market, limitPerSide: defaultProtobufValue }
    bids = [
      {side: 'BID', price: '0.001', amount: '0.003'}
    ]
    asks = [
      {side: 'ASK', price: '0.0031', amount: '0.0004'},
      {side: 'ASK', price: '0.005', amount: '0.0001'}
    ]
    orderbook = { getOrders: sinon.stub() }
    orderbook.getOrders.withArgs({ side: 'BID', limit: DEFAULT_LIMIT }).resolves(bids)
    orderbook.getOrders.withArgs({ side: 'ASK', limit: DEFAULT_LIMIT }).resolves(asks)
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

    expect(orderbook.getOrders).to.have.been.calledTwice()
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
    params.limitPerSide = '3'
    bids = [
      {side: 'BID', price: '0.0021', amount: '0.003'},
      {side: 'BID', price: '0.002', amount: '0.003'},
      {side: 'BID', price: '0.0019', amount: '0.003'}
    ]

    asks = [
      {side: 'ASK', price: '0.003', amount: '0.0004'},
      {side: 'ASK', price: '0.0031', amount: '0.0004'},
      {side: 'ASK', price: '0.0032', amount: '0.0004'}
    ]

    orderbook.getOrders.withArgs({ side: 'BID', limit: params.limitPerSide }).resolves(bids)
    orderbook.getOrders.withArgs({ side: 'ASK', limit: params.limitPerSide }).resolves(asks)
    orderbooks = new Map([['BTC/LTC', orderbook]])
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
