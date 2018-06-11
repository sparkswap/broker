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
      fromStorage: MarketEventOrderFromStorage
    })
  })

  describe('constructor', () => {
    xit('passes the store through')

    xit('assigns the side as ASK')
  })

  describe('#keyForPrice', () => {
    xit('left pads the price')
  })
})
