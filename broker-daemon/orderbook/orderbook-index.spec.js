const path = require('path')
const { expect, sinon, rewire } = require('test/test-helper')

const OrderbookIndex = rewire(path.resolve(__dirname, 'orderbook-index'))

describe('OrderbookIndex', () => {
  let baseStore
  let eventStore
  let marketName
  let SubsetStore

  beforeEach(() => {
    baseStore = {
      sublevel: sinon.stub()
    }
    eventStore = {
      fake: 'store'
    }
    marketName = 'BTC/LTC'

    SubsetStore = OrderbookIndex.__get__('SubsetStore')
  })

  describe('constructor', () => {
    let orderbookIndex
    let fakeStore

    beforeEach(() => {
      fakeStore = 'mystore'
      baseStore.sublevel.returns(fakeStore)
      orderbookIndex = new OrderbookIndex(baseStore, eventStore, marketName)
    })

    it('is a sub-class of SubsetStore', () => {
      expect(orderbookIndex).to.be.an.instanceOf(SubsetStore)
    })

    it('creates a store for the index', () => {
      expect(baseStore.sublevel).to.have.been.calledOnce()
      expect(baseStore.sublevel).to.have.been.calledWith('orderbook')
      // normally I would check that a stub had been called instead of reaching
      // into the functionality of the dependency, but class constructors are
      // basically impossible to stub.
      expect(orderbookIndex.store).to.be.eql(fakeStore)
    })

    it('uses the event store as the source store', () => {
      // normally I would check that a stub had been called instead of reaching
      // into the functionality of the dependency, but class constructors are
      // basically impossible to stub.
      expect(orderbookIndex.sourceStore).to.be.eql(eventStore)
    })

    it('assigns the market name', () => {
      expect(orderbookIndex.marketName).to.be.eql(marketName)
    })
  })

  describe('addToIndexOperation', () => {
    let MarketEvent
    let MarketEventOrder
    let orderKey
    let orderValue
    let event
    let eventKey
    let eventValue
    let orderbookIndex

    beforeEach(() => {
      MarketEvent = {
        fromStorage: sinon.stub(),
        TYPES: {
          PLACED: 'PLACED',
          CANCELLED: 'CANCELLED',
          FILLED: 'FILLED'
        }
      }
      MarketEventOrder = {
        fromEvent: sinon.stub()
      }

      OrderbookIndex.__set__('MarketEvent', MarketEvent)
      OrderbookIndex.__set__('MarketEventOrder', MarketEventOrder)

      orderKey = 'mykey'
      orderValue = 'myvalue'
      eventKey = 'yourkey'
      eventValue = 'yourvalue'
      event = {
        eventType: MarketEvent.TYPES.PLACED
      }

      MarketEvent.fromStorage.returns(event)
      MarketEventOrder.fromEvent.returns({
        key: orderKey,
        value: orderValue
      })

      orderbookIndex = new OrderbookIndex(baseStore, eventStore, marketName)
    })

    it('inflates the market event', () => {
      orderbookIndex.addToIndexOperation(eventKey, eventValue)

      expect(MarketEvent.fromStorage).to.have.been.calledOnce()
      expect(MarketEvent.fromStorage).to.have.been.calledWith(eventKey, eventValue)
    })

    it('creates an order from the market event', () => {
      orderbookIndex.addToIndexOperation(eventKey, eventValue)

      expect(MarketEventOrder.fromEvent).to.have.been.calledOnce()
      expect(MarketEventOrder.fromEvent).to.have.been.calledWith(event, orderbookIndex.marketName)
    })

    it('creates orders when they are PLACED', () => {
      const addOp = orderbookIndex.addToIndexOperation(eventKey, eventValue)

      expect(addOp).to.be.eql({ type: 'put', key: orderKey, value: orderValue, prefix: orderbookIndex.store })
    })

    it('removes orders when they are CANCELLED', () => {
      event.eventType = MarketEvent.TYPES.CANCELLED

      const addOp = orderbookIndex.addToIndexOperation(eventKey, eventValue)

      expect(addOp).to.be.eql({ type: 'del', key: orderKey, prefix: orderbookIndex.store })
    })

    it('removes orders when they are FILLED', () => {
      event.eventType = MarketEvent.TYPES.FILLED

      const addOp = orderbookIndex.addToIndexOperation(eventKey, eventValue)

      expect(addOp).to.be.eql({ type: 'del', key: orderKey, prefix: orderbookIndex.store })
    })
  })
})
