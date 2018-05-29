const { expect } = require('test/test-helper')

const Order = require('./order')

describe('Order', () => {
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

    xit('creates orders from a key and value')

    xit('assigns parameters from after order creation to the order object')
  })

  describe('::fromObject', () => {
    it('defines a static method for creating orders from a plain object', () => {
      expect(Order).itself.to.respondTo('fromObject')
    })

    xit('creates Orders from a plain object')

    xit('assigns parameters from after order creation to the order object')
  })

  describe('new', () => {
    xit('creates an order')
  })

  describe('get key', () => {
    xit('defines a key getter')
  })

  describe('get value', () => {
    xit('defines a value getter for storage')
  })

  describe('get valueObject', () => {
    xit('defines a getter for retrieving a plain object')
  })

  describe('get createParams', () => {
    xit('defines a getter for params required to create an order on the relayer')
  })

  describe('#addCreatedParams', () => {
    xit('updates the object with the params from creating on the relayer')

    xit('includes the updated params with the saved value')
  })
})
