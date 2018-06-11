const path = require('path')
const { rewire, sinon, expect } = require('test/test-helper')

const BidIndex = rewire(path.resolve(__dirname, 'price-indexes'))

describe('#BidIndex', () => {
  let store
  let MarketEventOrderFromStorage

  beforeEach(() => {
    store = {
      sublevel: sinon.stub(),
      get: sinon.stub()
    }

    MarketEventOrderFromStorage = sinon.stub()

    BidIndex.__set__('MarketEventOrder', {
      fromStorage: MarketEventOrderFromStorage
    })
  })


  describe('constructor', () => {
    xit('passes the store through')

    xit('assigns the side as BID')
  })

  describe('#keyForPrice', () => {
    xit('left pads the price')

    xit('provides a consistent amount of decimal places')

    xit('gives higher prices lower indexes')
  })
})
