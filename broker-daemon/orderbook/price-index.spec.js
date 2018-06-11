const path = require('path')
const { rewire, sinon, expect } = require('test/test-helper')

const PriceIndex = rewire(path.resolve(__dirname, 'price-index'))

describe('PriceIndex', () => {
  let store
  let MarketEventOrderFromStorage
  let side
  let price

  beforeEach(() => {
    store = {
      sublevel: sinon.stub(),
      get: sinon.stub()
    }

    MarketEventOrderFromStorage = sinon.stub().returns({
      orderId: 'abc',
      side,
      price
    })

    PriceIndex.__set__('MarketEventOrder', {
      fromStorage: MarketEventOrderFromStorage
    })

    side = 'ASK'
    price = '100'
  })

  describe('constructor', () => {
    xit('passes the store through to the index')

    xit('passes the side through to the index as a name')

    it('assigns the side to a local property', () => {
      const index = new PriceIndex(store, side)

      expect(index).to.have.property('side', side)
    })

    it('passes the _getValue function through', () => {
      const bound = 'fakefn'
      const _getValue = PriceIndex.prototype._getValue
      PriceIndex.prototype._getValue = {
        bind: sinon.stub().returns(bound)
      }
      const index = new PriceIndex(store, side)

      expect(index).to.have.property('getValue', bound)
      PriceIndex.prototype._getValue = _getValue
    })

    it('passes the _filter function through', () => {
      const bound = 'fakefn'
      const _filter = PriceIndex.prototype._filter
      PriceIndex.prototype._filter = {
        bind: sinon.stub().returns(bound)
      }
      const index = new PriceIndex(store, side)

      expect(index).to.have.property('filter', bound)
      PriceIndex.prototype._filter = _filter
    })
  })

  describe('instance', () => {
    let index
    let fakeKey
    let fakeValue

    beforeEach(() => {
      index = new PriceIndex(store, side)
      fakeKey = 'mykey'
      fakeValue = 'myvalue'
    })

    describe('#_filter', () => {
      it('inflates the order from storage', () => {
        index._filter(fakeKey, fakeValue)

        expect(MarketEventOrderFromStorage).to.have.been.calledOnce()
        expect(MarketEventOrderFromStorage).to.have.been.calledWith(fakeKey, fakeValue)
      })

      it('filters out orders not of the side', () => {
        index.side = 'BID'
        expect(index._filter(fakeKey, fakeValue)).to.be.equal(false)
      })

      it('allows orders of the side', () => {
        expect(index._filter(fakeKey, fakeValue)).to.be.equal(true)
      })
    })

    describe('#_getValue', () => {
      let keyForPrice
      let keyForPriceStub

      beforeEach(() => {
        keyForPriceStub = sinon.stub()
        keyForPrice = PriceIndex.prototype.keyForPrice
        PriceIndex.prototype.keyForPrice = keyForPriceStub
      })

      afterEach(() => {
        PriceIndex.prototype.keyForPrice = keyForPrice
      })

      it('inflates the order from storage', () => {
        index._getValue(fakeKey, fakeValue)

        expect(MarketEventOrderFromStorage).to.have.been.calledOnce()
        expect(MarketEventOrderFromStorage).to.have.been.calledWith(fakeKey, fakeValue)
      })

      it('retrieves the index value for the order price', () => {
        const fakeIndex = '029348023984'
        keyForPriceStub.returns(fakeIndex)

        expect(index._getValue(fakeKey, fakeValue)).to.be.equal(fakeIndex)
        expect(keyForPriceStub).to.have.been.calledWith(price)
      })
    })

    describe('#keyForPrice', () => {
      it('throws the unimplemented method', () => {
        expect(() => index.keyForPrice()).to.throw()
      })
    })

    describe('#streamOrdersAtPriceOrBetter', () => {
      let SublevelIndex
      let createReadStream
      let createReadStreamStub
      let keyForPriceStub

      beforeEach(() => {
        createReadStreamStub = sinon.stub()

        SublevelIndex = Indexes.__get__('SublevelIndex')
        createReadStream = SublevelIndex.prototype.createReadStream
        SublevelIndex.prototype.createReadStream = createReadStreamStub

        keyForPriceStub = sinon.stub()
        PriceIndex.prototype.keyForPrice = keyForPriceStub
      })

      afterEach(() => {
        SublevelIndex.prototype.createReadStream = createReadStream
      })

      it('creates a stream', () => {
        const fakeStream = 'my stream'
        createReadStreamStub.returns(fakeStream)

        expect(index.streamOrdersAtPriceOrBetter()).to.be.equal(fakeStream)
        expect(createReadStreamStub).to.have.been.calledOnce()
      })

      xit('filters that stream to keys less than the index for the given price')
    })
  })
})