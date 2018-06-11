const path = require('path')
const { rewire, sinon, expect } = require('test/test-helper')

const BidIndex = rewire(path.resolve(__dirname, 'bid-index'))

describe.only('#BidIndex', () => {
  let store
  let MarketEventOrderFromStorage

  beforeEach(() => {
    store = {
      sublevel: sinon.stub(),
      get: sinon.stub()
    }

    MarketEventOrderFromStorage = sinon.stub()

    BidIndex.__set__('MarketEventOrder', {
      SIDES: {
        ASK: 'ASK',
        BID: 'BID'
      },
      fromStorage: MarketEventOrderFromStorage
    })
  })

  describe('constructor', () => {
    xit('passes the store through')

    xit('assigns the side as BID')
  })

  describe('#keyForPrice', () => {
    let index

    beforeEach(() => {
      index = new BidIndex(store)
    })

    it('left pads the price', () => {
      const price = '12345'
      const keyForPrice = index.keyForPrice(price)

      expect(keyForPrice).to.have.lengthOf(40)
      expect(keyForPrice.slice(0, 1)).to.be.equal('0')
    })

    it('provides a consistent amount of decimal places', () => {
      const price = '12345'
      const keyForPrice = index.keyForPrice(price)

      expect(keyForPrice.split('.')[1]).to.be.equal('0000000000000000000')
    })

    it('gives higher prices lower indexes', () => {
      const priceLow = '1'
      const priceHigh = '2'

      expect(index.keyForPrice(priceHigh).localeCompare(index.keyForPrice(priceLow))).to.be.lessThan(0)
    })
  })
})
