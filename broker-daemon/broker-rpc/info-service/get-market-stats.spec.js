const path = require('path')
const nano = require('nano-seconds')
const {
  expect,
  rewire,
  sinon,
  timekeeper
} = require('test/test-helper')

const { Big } = require('../../utils')

const getMarketStats = rewire(path.resolve(__dirname, 'get-market-stats'))

describe('getMarketStats', () => {
  let market
  let params
  let logger
  let orderbooks
  let GetMarketStatsResponse
  let getOrderbookEventsByTimestampStub
  let getMarketEventsByTimestampStub

  beforeEach(() => {
    market = 'BTC/LTC'
    getOrderbookEventsByTimestampStub = sinon.stub()
    getMarketEventsByTimestampStub = sinon.stub()
    GetMarketStatsResponse = sinon.stub()
    params = { market }
    logger = {
      debug: sinon.stub(),
      info: sinon.stub(),
      error: sinon.stub()
    }
    orderbooks = new Map([
      [
        'BTC/LTC',
        {
          getOrderbookEventsByTimestamp: getOrderbookEventsByTimestampStub,
          getMarketEventsByTimestamp: getMarketEventsByTimestampStub
        }
      ]
    ])
  })

  beforeEach(() => {
    timekeeper.freeze(new Date())
  })

  afterEach(() => {
    timekeeper.reset()
  })

  describe('error handling', () => {
    it('throws an error if orderbook is not found', () => {
      orderbooks = new Map()
      return expect(
        getMarketStats({ orderbooks, logger, params }, { GetMarketStatsResponse })
      ).to.eventually.be.rejectedWith(market, 'not being tracked as a market')
    })
  })

  describe('getMarketStats', () => {
    let orderbookEvents
    let marketEvents
    let timestamp
    let datetime
    let nanoToStringStub
    let nanoToISOStringStub
    let currentTime
    let bestAskAmountStub
    let bestBidAmountStub
    let highestPriceStub
    let lowestPriceStub
    let vwapStub
    let baseVolumeStub
    let counterVolumeStub
    let marketStatsStub
    let bestAskAmount
    let bestBidAmount
    let highestPrice
    let lowestPrice
    let vwap
    let baseVolume
    let counterVolume
    let orderbookAsk
    let orderbookBid
    let filledOrder

    beforeEach(() => {
      currentTime = nano.now()
      timestamp = nano.toString(currentTime)
      datetime = nano.toISOString(currentTime)
      nanoToStringStub = sinon.stub().returns(timestamp)
      nanoToISOStringStub = sinon.stub().returns(datetime)

      getMarketStats.__set__('nano', {
        now: () => currentTime,
        toString: nanoToStringStub,
        toISOString: nanoToISOStringStub
      })

      orderbookAsk = { baseAmount: 122, counterAmount: 333, side: 'ASK', eventType: 'PLACED' }
      orderbookBid = { baseAmount: 122, counterAmount: 333, side: 'BID', eventType: 'PLACED' }
      filledOrder = { baseAmount: 123, counterAmount: 332, side: 'ASK', eventType: 'FILLED' }
      orderbookEvents = [orderbookBid, orderbookAsk]
      marketEvents = [orderbookAsk, orderbookBid, filledOrder]
      getOrderbookEventsByTimestampStub.returns(orderbookEvents)
      getMarketEventsByTimestampStub.returns(marketEvents)

      bestAskAmount = Big(0.00000231)
      bestBidAmount = Big(0.0001)
      highestPrice = Big(59.2)
      lowestPrice = Big(50.2)
      vwap = Big(59.2)
      baseVolume = Big(0.12341222)
      counterVolume = Big(0.2343)

      bestAskAmountStub = sinon.stub().returns(bestAskAmount)
      bestBidAmountStub = sinon.stub().returns(bestBidAmount)
      highestPriceStub = sinon.stub().returns(highestPrice)
      lowestPriceStub = sinon.stub().returns(lowestPrice)
      vwapStub = sinon.stub().returns(vwap)
      baseVolumeStub = sinon.stub().returns(baseVolume)
      counterVolumeStub = sinon.stub().returns(counterVolume)

      marketStatsStub = sinon.stub()
      marketStatsStub.prototype.bestAskAmount = bestAskAmountStub
      marketStatsStub.prototype.bestBidAmount = bestBidAmountStub
      marketStatsStub.prototype.highestPrice = highestPriceStub
      marketStatsStub.prototype.lowestPrice = lowestPriceStub
      marketStatsStub.prototype.vwap = vwapStub
      marketStatsStub.prototype.baseVolume = baseVolumeStub
      marketStatsStub.prototype.counterVolume = counterVolumeStub

      getMarketStats.__set__('MarketStats', marketStatsStub)
    })

    beforeEach(async () => {
      await getMarketStats({ orderbooks, logger, params }, { GetMarketStatsResponse })
    })

    it('creates a timestamp for the request', () => {
      expect(nanoToStringStub).to.have.been.calledWith(currentTime)
    })

    it('creates a datetime timestamp for the request', () => {
      expect(nanoToISOStringStub).to.have.been.calledWith(currentTime)
    })

    it('grabs all recent orderbook events for an orderbook', () => {
      const dayInNanoSeconds = getMarketStats.__get__('ONE_DAY_IN_NANOSECONDS')
      const expectedStartTime = Big(timestamp).minus(dayInNanoSeconds)
      expect(getOrderbookEventsByTimestampStub).to.have.been.calledOnce()
      expect(getOrderbookEventsByTimestampStub).to.have.been.calledWith(expectedStartTime)
    })

    it('grabs all market events for an orderbook', () => {
      const dayInNanoSeconds = getMarketStats.__get__('ONE_DAY_IN_NANOSECONDS')
      const expectedStartTime = Big(timestamp).minus(dayInNanoSeconds)
      expect(getMarketEventsByTimestampStub).to.have.been.calledOnce()
      expect(getMarketEventsByTimestampStub).to.have.been.calledWith(expectedStartTime)
    })

    it('gets the best ask price for current asks', () => {
      expect(lowestPriceStub).to.have.been.calledWith([orderbookAsk])
    })

    it('gets the best ask amount for current asks', () => {
      expect(bestAskAmountStub).to.have.been.calledWith([orderbookAsk])
    })

    it('gets the best bid price for current bids', () => {
      expect(highestPriceStub).to.have.been.calledWith([orderbookBid])
    })

    it('gets the best bid amount for current bids', () => {
      expect(bestBidAmountStub).to.have.been.calledWith([orderbookBid])
    })

    it('gets the highest price for a collection of events', () => {
      expect(highestPriceStub).to.have.been.calledWith([filledOrder])
    })

    it('gets the lowest price for a collection of events', () => {
      expect(lowestPriceStub).to.have.been.calledWith([filledOrder])
    })

    it('gets the vwap for a collection of events', () => {
      expect(vwapStub).to.have.been.calledWith([filledOrder])
    })

    it('gets the total amount of base currency', () => {
      expect(baseVolumeStub).to.have.been.calledWith([filledOrder])
    })

    it('gets the total amount of counter (quote) currency', () => {
      expect(counterVolumeStub).to.have.been.calledWith([filledOrder])
    })

    it('returns market data', () => {
      expect(GetMarketStatsResponse).to.have.been.calledWith(sinon.match({
        symbol: market,
        timestamp,
        datetime,
        high: highestPrice.toString(),
        low: lowestPrice.toString(),
        ask: lowestPrice.toString(),
        askVolume: bestAskAmount.toString(),
        bid: highestPrice.toString(),
        bidVolume: bestBidAmount.toString(),
        vwap: vwap.toString(),
        baseVolume: baseVolume.toString(),
        counterVolume: counterVolume.toString()
      }))
    })
  })
})
