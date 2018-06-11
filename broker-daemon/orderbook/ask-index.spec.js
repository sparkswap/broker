const path = require('path')
const { rewire, sinon, expect } = require('test/test-helper')

const AskIndex = rewire(path.resolve(__dirname, 'ask-index'))

describe('AskIndex', () => {
  let store
  let MarketEventOrderFromStorage

  beforeEach(() => {
    store = {
      sublevel: sinon.stub(),
      get: sinon.stub()
    }

    MarketEventOrderFromStorage = sinon.stub()

    AskIndex.__set__('MarketEventOrder', {
      SIDES: {
        ASK: 'ASK',
        BID: 'BID'
      },
      fromStorage: MarketEventOrderFromStorage
    })
  })

  describe('constructor', () => {
    xit('passes the store through')

    xit('assigns the side as ASK')
  })

  describe('#keyForPrice', () => {
    let index

    beforeEach(() => {
      index = new AskIndex(store)
    })

    it('left pads the price', () => {
      const price = '12345'
      const keyForPrice = index.keyForPrice(price)

      expect(keyForPrice).to.have.lengthOf(32)
      expect(keyForPrice.slice(0, 27)).to.be.equal('000000000000000000000000000')
      expect(keyForPrice.slice(27)).to.be.equal(price)
    })
  })
})
