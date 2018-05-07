const { chai } = require('test/test-helper')
const { expect } = chai

const MarketEvent = require('./market-event')

describe('MarketEvent', () => {
  describe('::TYPES', () => {
    it('defines 3 market event types', () => {
      expect(MarketEvent).to.have.property('TYPES')
      expect(Object.keys(MarketEvent.TYPES)).to.have.lengthOf(3)
    })

    it('freezes market event types', () => {
      expect(MarketEvent.TYPES).to.be.frozen()
    })

    it('defines a PLACED event', () => {
      expect(MarketEvent.TYPES).to.have.property('PLACED')
      expect(MarketEvent.TYPES.PLACED).to.be.eql('PLACED')
    })

    it('defines a FILLED event', () => {
      expect(MarketEvent.TYPES).to.have.property('FILLED')
      expect(MarketEvent.TYPES.FILLED).to.be.eql('FILLED')
    })

    it('defines a CANCELLED event', () => {
      expect(MarketEvent.TYPES).to.have.property('CANCELLED')
      expect(MarketEvent.TYPES.CANCELLED).to.be.eql('CANCELLED')
    })
  })

  describe('::sep', () => {
    it('defines a separator', () => {
      expect(MarketEvent).to.have.property('sep')
      expect(MarketEvent.sep).to.be.equal(':')
    })
  })

  describe('::fromStorage', () => {
    it('defines a static method for creating events from storage', () => {
      expect(MarketEvent).itself.to.respondTo('fromStorage')
    })

    it('creates events from a key and value', () => {
      const eventId = 'myid'
      const orderId = 'myorder'
      const timestamp = '123456677'
      const eventType = MarketEvent.TYPES.PLACED

      const key = `${timestamp}:${eventId}`
      const value = {
        eventType,
        orderId
      }

      const event = MarketEvent.fromStorage(key, value)

      expect(event).to.have.property('eventId')
      expect(event.eventId).to.be.eql(eventId)
      expect(event).to.have.property('orderId')
      expect(event.orderId).to.be.eql(orderId)
      expect(event).to.have.property('timestamp')
      expect(event.timestamp).to.be.eql(timestamp)
      expect(event).to.have.property('eventType')
      expect(event.eventType).to.be.eql(eventType)
    })

    it('creates events with mixed payloads from a key and value', () => {
      const eventId = 'myid'
      const orderId = 'myorder'
      const timestamp = '123456677'
      const eventType = MarketEvent.TYPES.PLACED
      const payload = {
        my: 'props',
        are: 1
      }

      const key = `${timestamp}:${eventId}`
      const value = {
        eventType,
        orderId,
        ...payload
      }

      const event = MarketEvent.fromStorage(key, value)

      expect(event).to.have.property('payload')
      expect(payload).to.be.eql(payload)
    })
  })

  describe('new', () => {
    it('creates a market event', () => {
      const eventId = 'myid'
      const orderId = 'myorder'
      const timestamp = '123456677'
      const eventType = MarketEvent.TYPES.PLACED

      const event = new MarketEvent({ eventId, orderId, timestamp, eventType })

      expect(event).to.have.property('eventId')
      expect(event.eventId).to.be.eql(eventId)
      expect(event).to.have.property('orderId')
      expect(event.orderId).to.be.eql(orderId)
      expect(event).to.have.property('timestamp')
      expect(event.timestamp).to.be.eql(timestamp)
      expect(event).to.have.property('eventType')
      expect(event.eventType).to.be.eql(eventType)
    })

    it('does not create events with wrong event type', () => {
      const fakeEventType = 'GIZMOED'

      expect(() => new MarketEvent({ eventType: fakeEventType })).to.throw()
    })

    it('creates events with a mixed payload', () => {
      const eventId = 'myid'
      const orderId = 'myorder'
      const timestamp = '123456677'
      const eventType = MarketEvent.TYPES.PLACED
      const payload = {
        my: 'props',
        are: 1
      }

      const eventProps = {
        eventId,
        orderId,
        timestamp,
        eventType,
        ...payload
      }

      const event = new MarketEvent(eventProps)
      expect(event).to.have.property('payload')
      expect(payload).to.be.eql(payload)
    })
  })

  describe('get key', () => {
    it('defines a key getter for sorting and identification', () => {
      const eventId = 'myid'
      const orderId = 'myorder'
      const timestamp = '123456677'
      const eventType = MarketEvent.TYPES.PLACED

      const event = new MarketEvent({ eventId, orderId, timestamp, eventType })

      expect(event).to.have.property('key')
      expect(event.key).to.be.eql(`${timestamp}:${eventId}`)
    })
  })

  describe('get value', () => {
    it('defines a value getter for storage', () => {
      const eventId = 'myid'
      const orderId = 'myorder'
      const timestamp = '123456677'
      const eventType = MarketEvent.TYPES.PLACED

      const event = new MarketEvent({ eventId, orderId, timestamp, eventType })

      expect(event).to.have.property('value')
      expect(event.value).to.be.eql({
        orderId,
        eventType
      })
    })

    it('includes mixed payloads in values for storage', () => {
      const eventId = 'myid'
      const orderId = 'myorder'
      const timestamp = '123456677'
      const eventType = MarketEvent.TYPES.PLACED
      const payload = {
        my: 'props',
        are: 1
      }

      const eventProps = {
        eventId,
        orderId,
        timestamp,
        eventType,
        ...payload
      }

      const event = new MarketEvent(eventProps)
      expect(event.value).to.have.property('my')
      expect(event.value.my).to.be.eql(payload.my)
      expect(event.value).to.have.property('are')
      expect(event.value.are).to.be.eql(payload.are)
    })
  })

  describe('#serialize', () => {
    it('defines a serialize method', () => {
      expect(MarketEvent).to.respondTo('serialize')
    })

    it('serializes market events', () => {
      const eventId = 'myid'
      const orderId = 'myorder'
      const timestamp = '123456677'
      const eventType = MarketEvent.TYPES.PLACED

      const event = new MarketEvent({ eventId, orderId, timestamp, eventType })
      const serialized = event.serialize()

      expect(serialized).to.be.eql({
        eventId,
        orderId,
        timestamp,
        eventType
      })
    })

    it('serializes mixed payloads', () => {
      const eventId = 'myid'
      const orderId = 'myorder'
      const timestamp = '123456677'
      const eventType = MarketEvent.TYPES.PLACED
      const payload = {
        my: 'props',
        are: 1
      }

      const eventProps = {
        eventId,
        orderId,
        timestamp,
        eventType,
        ...payload
      }

      const event = new MarketEvent(eventProps)
      const serialized = event.serialize()

      expect(serialized).to.have.property('my')
      expect(serialized.my).to.be.eql(payload.my)
      expect(serialized).to.have.property('are')
      expect(serialized.are).to.be.eql(payload.are)
    })
  })
})
