const path = require('path')
const {
  expect,
  rewire
} = require('test/test-helper')
const { Big } = require('../../utils')

const MarketStats = rewire(path.resolve(__dirname, 'market-stats'))

describe('MarketStats', () => {
  let market
  let currencyConfig
  let stats

  beforeEach(() => {
    market = 'BTC/ETH'
    currencyConfig = [{
      name: 'Bitcoin',
      symbol: 'BTC',
      quantumsPerCommon: '100000000',
      maxChannelBalance: '16777215'
    }, {
      name: 'Ethereum',
      symbol: 'ETH',
      quantumsPerCommon: '100000000',
      maxChannelBalance: '16777215'
    }]

    MarketStats.__set__('currencyConfig', currencyConfig)
  })

  beforeEach(() => {
    stats = new MarketStats(market)
  })

  describe('constructor', () => {
    it('errors if base currency config is missing', () => {
      const badMarket = 'LTC/ETH'
      expect(() => new MarketStats(badMarket)).to.throw('Currency was not found', 'LTC')
    })

    it('errors if counter currency config is missing', () => {
      const badMarket = 'ETH/XLM'
      expect(() => new MarketStats(badMarket)).to.throw('Currency was not found', 'XLM')
    })

    it('sets a market property', () => expect(stats).to.have.property('market'))
    it('sets a baseSymbol property', () => expect(stats).to.have.property('baseSymbol'))
    it('sets a counterSymbol property', () => expect(stats).to.have.property('counterSymbol'))
    it('sets a baseQuantumsPerCommon property', () => expect(stats).to.have.property('baseQuantumsPerCommon'))
    it('sets a counterQuantumsPerCommon property', () => expect(stats).to.have.property('counterQuantumsPerCommon'))
  })

  describe('#highestPrice', () => {
    let events = [
      { baseAmount: '10000', counterAmount: '592000' },
      { baseAmount: '31000', counterAmount: '1592000' },
      { baseAmount: '110000', counterAmount: '2592000' }
    ]

    it('gives the highest price for an array of events', async () => {
      const expectedResult = Big(events[0].counterAmount).div(events[0].baseAmount)
      const res = await stats.highestPrice(events)
      expect(res).to.be.an.instanceOf(Big)
      expect(res.toString()).to.be.eql(expectedResult.toString())
    })

    it('returns zero if no events are passed in', async () => {
      const expectedResult = Big(0)
      const res = await stats.highestPrice()
      expect(res).to.be.an.instanceOf(Big)
      expect(res.toString()).to.be.eql(expectedResult.toString())
    })
  })

  describe('#lowestPrice', () => {
    let events = [
      { baseAmount: '10000', counterAmount: '592000' },
      { baseAmount: '31000', counterAmount: '1592000' },
      { baseAmount: '110000', counterAmount: '2592000' }
    ]

    it('gives the lowest price for an array of events', async () => {
      const expectedResult = Big(events[2].counterAmount).div(events[2].baseAmount)
      const res = await stats.lowestPrice(events)
      expect(res).to.be.an.instanceOf(Big)
      expect(res.toString()).to.be.eql(expectedResult.toString())
    })

    it('returns zero if no events are passed in', async () => {
      const expectedResult = Big(0)
      const res = await stats.lowestPrice()
      expect(res).to.be.an.instanceOf(Big)
      expect(res.toString()).to.be.eql(expectedResult.toString())
    })

    it('returns the first element if only one record exists', async () => {
      const singleEvent = { baseAmount: '0.0001', counterAmount: '0.00592' }
      const expectedResult = Big(singleEvent.counterAmount).div(singleEvent.baseAmount)
      const res = await stats.lowestPrice([singleEvent])
      expect(res).to.be.an.instanceOf(Big)
      expect(res.toString()).to.be.eql(expectedResult.toString())
    })
  })

  describe('#vwap', () => {
    let events = [
      { baseAmount: '10000', counterAmount: '592000' },
      { baseAmount: '31000', counterAmount: '1592000' },
      { baseAmount: '110000', counterAmount: '2592000' }
    ]

    it('returns the correct vwap for a collection of events', async () => {
      const expectedVwap = Big('25.86')
      const res = await stats.vwap(events)
      expect(res).to.be.an.instanceOf(Big)
      expect(res.toString()).to.include(expectedVwap.toString())
    })

    it('returns zero if no events are passed', async () => {
      const expectedVwap = Big(0)
      const res = await stats.vwap([])
      expect(res).to.be.an.instanceOf(Big)
      expect(res.toString()).to.be.eql(expectedVwap.toString())
    })
  })

  describe('#bestAskAmount', () => {
    let events = [
      { baseAmount: '10000', counterAmount: '592000' },
      { baseAmount: '31000', counterAmount: '1592000' },
      { baseAmount: '110000', counterAmount: '2592000' }
    ]

    it('returns the best ask amount', async () => {
      const expectedResult = Big('0.0001')
      const res = await stats.bestAskAmount(events)
      expect(res).to.be.an.instanceOf(Big)
      expect(res.toString()).to.be.eql(expectedResult.toString())
    })

    it('returns zero if no events are passed in', async () => {
      const expectedResult = Big('0')
      const res = await stats.bestAskAmount()
      expect(res).to.be.an.instanceOf(Big)
      expect(res.toString()).to.be.eql(expectedResult.toString())
    })
  })

  describe('#bestBidAmount', () => {
    let events = [
      { baseAmount: '10000', counterAmount: '592000' },
      { baseAmount: '31000', counterAmount: '1592000' },
      { baseAmount: '110000', counterAmount: '2592000' }
    ]

    it('returns the best ask amount', async () => {
      const expectedResult = Big('0.0011')
      const res = await stats.bestBidAmount(events)
      expect(res).to.be.an.instanceOf(Big)
      expect(res.toString()).to.be.eql(expectedResult.toString())
    })

    it('returns zero if no events are passed in', async () => {
      const expectedResult = Big('0')
      const res = await stats.bestBidAmount()
      expect(res).to.be.an.instanceOf(Big)
      expect(res.toString()).to.be.eql(expectedResult.toString())
    })
  })

  describe('baseVolume', () => {
    let events = [
      { baseAmount: '10000', counterAmount: '592000' },
      { baseAmount: '31000', counterAmount: '1592000' },
      { baseAmount: '110000', counterAmount: '2592000' }
    ]

    it('returns base currency volume', async () => {
      const expectedResult = Big('0.00151')
      const res = await stats.baseVolume(events)
      expect(res).to.be.an.instanceOf(Big)
      expect(res.toString()).to.be.eql(expectedResult.toString())
    })

    it('returns zero if no events are passed in', async () => {
      const expectedResult = Big('0')
      const res = await stats.baseVolume()
      expect(res).to.be.an.instanceOf(Big)
      expect(res.toString()).to.be.eql(expectedResult.toString())
    })
  })

  describe('counterVolume', () => {
    let events = [
      { baseAmount: '10000', counterAmount: '592000' },
      { baseAmount: '31000', counterAmount: '1592000' },
      { baseAmount: '110000', counterAmount: '2592000' }
    ]

    it('returns counter currency volume', async () => {
      const expectedResult = Big('0.04776')
      const res = await stats.counterVolume(events)
      expect(res).to.be.an.instanceOf(Big)
      expect(res.toString()).to.be.eql(expectedResult.toString())
    })

    it('returns zero if no events are passed in', async () => {
      const expectedResult = Big('0')
      const res = await stats.counterVolume()
      expect(res).to.be.an.instanceOf(Big)
      expect(res.toString()).to.be.eql(expectedResult.toString())
    })
  })
})
