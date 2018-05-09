const path = require('path')
const { chai, rewire } = require('test/test-helper')
const { expect } = chai

const Order = rewire(path.resolve('broker-daemon', 'models', 'order'))

describe('Order', () => {
  let MarketEvent

  before(() => {
    MarketEvent = {
      TYPES: {
        PLACED: 'PLACED',
        CANCELLED: 'CANCELLED',
        FILLED: 'FILLED'
      }
    }

    Order.__set__('MarketEvent', MarketEvent)
  })

  describe('::SIDES', () => {
    it('defines 2 sides', () => {
      expect(Order).to.have.property('SIDES')
      expect(Object.keys(Order.SIDES)).to.have.lengthOf(2)
    })

    it('freezes sides', () => {
      expect(Order.SIDES).to.be.frozen()
    })

    it('defines a BID side', () => {
      expect(Order.SIDES).to.have.property('BID')
      expect(Order.SIDES.BID).to.be.eql('BID')
    })

    it('defines a ASK side', () => {
      expect(Order.SIDES).to.have.property('ASK')
      expect(Order.SIDES.ASK).to.be.eql('ASK')
    })
  })

  describe('::fromStorage', () => {
    it('defines a static method for creating orderss from storage', () => {
      expect(Order).itself.to.respondTo('fromStorage')
    })

    it('creates orders from a key and value', () => {
      const orderId = 'myorder'
      const createdAt = '12234324235'
      const baseAmount = 123214234
      const counterAmount = 123214324
      const side = Order.SIDES.BID

      const key = orderId
      const value = JSON.stringify({
        createdAt,
        baseAmount,
        counterAmount,
        side
      })

      const order = Order.fromStorage(key, value)

      expect(order).to.have.property('orderId')
      expect(order.orderId).to.be.eql(orderId)
      expect(order).to.have.property('createdAt')
      expect(order.createdAt).to.be.eql(createdAt)
      expect(order).to.have.property('baseAmount')
      expect(order.baseAmount).to.be.eql(baseAmount)
      expect(order).to.have.property('counterAmount')
      expect(order.counterAmount).to.be.eql(counterAmount)
      expect(order).to.have.property('side')
      expect(order.side).to.be.eql(side)
    })
  })

  describe('::fromEvent', () => {
    it('defines a static method for creating orderss from an event', () => {
      expect(Order).itself.to.respondTo('fromEvent')
    })

    it('creates orders from a PLACED event', () => {
      const orderId = 'myorder'
      const createdAt = '12234324235'
      const baseAmount = 123214234
      const counterAmount = 123214324
      const side = Order.SIDES.BID

      const event = {
        eventId: 'asodifj',
        orderId,
        timestamp: createdAt,
        eventType: MarketEvent.TYPES.PLACED,
        payload: {
          baseAmount,
          counterAmount,
          side
        }
      }

      const order = Order.fromEvent(event)

      expect(order).to.have.property('orderId')
      expect(order.orderId).to.be.eql(orderId)
      expect(order).to.have.property('createdAt')
      expect(order.createdAt).to.be.eql(createdAt)
      expect(order).to.have.property('baseAmount')
      expect(order.baseAmount).to.be.eql(baseAmount)
      expect(order).to.have.property('counterAmount')
      expect(order.counterAmount).to.be.eql(counterAmount)
      expect(order).to.have.property('side')
      expect(order.side).to.be.eql(side)
    })

    it('creates stub orders from a CANCELLED event', () => {
      const orderId = 'myorder'

      const event = {
        eventId: 'asodifj',
        orderId,
        timestamp: '123142344',
        eventType: MarketEvent.TYPES.CANCELLED
      }

      const order = Order.fromEvent(event)

      expect(order).to.have.property('orderId')
      expect(order.orderId).to.be.eql(orderId)
    })

    it('creates stub orders from a FILLED event', () => {
      const orderId = 'myorder'

      const event = {
        eventId: 'asodifj',
        orderId,
        timestamp: '123142344',
        eventType: MarketEvent.TYPES.FILLED
      }

      const order = Order.fromEvent(event)

      expect(order).to.have.property('orderId')
      expect(order.orderId).to.be.eql(orderId)
    })
  })

  describe('new', () => {
    it('creates an order', () => {
      const orderId = 'myorder'
      const createdAt = '12234324235'
      const baseAmount = 123214234
      const counterAmount = 123214324
      const side = Order.SIDES.BID

      const order = new Order({ orderId, createdAt, baseAmount, counterAmount, side })

      expect(order).to.have.property('orderId')
      expect(order.orderId).to.be.eql(orderId)
      expect(order).to.have.property('createdAt')
      expect(order.createdAt).to.be.eql(createdAt)
      expect(order).to.have.property('baseAmount')
      expect(order.baseAmount).to.be.eql(baseAmount)
      expect(order).to.have.property('counterAmount')
      expect(order.counterAmount).to.be.eql(counterAmount)
      expect(order).to.have.property('side')
      expect(order.side).to.be.eql(side)
    })
  })

  describe('get key', () => {
    it('defines a key getter', () => {
      const orderId = 'myorder'
      const createdAt = '12234324235'
      const baseAmount = 123214234
      const counterAmount = 123214324
      const side = Order.SIDES.BID

      const order = new Order({ orderId, createdAt, baseAmount, counterAmount, side })

      expect(order).to.have.property('key')
      expect(order.key).to.be.eql(orderId)
    })
  })

  describe('get value', () => {
    it('defines a value getter for storage', () => {
      const orderId = 'myorder'
      const createdAt = '12234324235'
      const baseAmount = 123214234
      const counterAmount = 123214324
      const side = Order.SIDES.BID

      const order = new Order({ orderId, createdAt, baseAmount, counterAmount, side })

      expect(order).to.have.property('value')
      expect(order.value).to.be.eql(JSON.stringify({
        createdAt,
        baseAmount,
        counterAmount,
        side
      }))
    })
  })

  describe('get price', () => {
    it('defines a price getter', () => {
      const orderId = 'myorder'
      const createdAt = '12234324235'
      const baseAmount = 123214234
      const counterAmount = 123214324
      const side = Order.SIDES.BID

      const order = new Order({ orderId, createdAt, baseAmount, counterAmount, side })

      expect(order).to.have.property('price')
      expect(order.price).to.be.eql(counterAmount / baseAmount)
    })
  })
})
