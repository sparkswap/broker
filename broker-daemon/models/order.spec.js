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

    it('creates orders from a key and value', () => {
      const params = {
        baseSymbol: 'BTC',
        counterSymbol: 'LTC',
        side: 'BID',
        baseAmount: '10000',
        counterAmount: '100000',
        ownerId: 'fakeID',
        payTo: 'ln:123019230jasofdij'
      }
      const orderId = 'myid'

      const order = Order.fromStorage(orderId, JSON.stringify(params))

      expect(order).to.have.property('orderId', orderId)
      expect(order).to.have.property('baseSymbol', params.baseSymbol)
      expect(order).to.have.property('counterSymbol', params.counterSymbol)
      expect(order).to.have.property('side', params.side)
      expect(order).to.have.property('baseAmount', params.baseAmount)
      expect(order).to.have.property('counterAmount', params.counterAmount)
      expect(order).to.have.property('ownerId', params.ownerId)
      expect(order).to.have.property('payTo', params.payTo)
    })

    it('assigns parameters from after order creation to the order object', () => {
      const params = {
        baseSymbol: 'BTC',
        counterSymbol: 'LTC',
        side: 'BID',
        baseAmount: '10000',
        counterAmount: '100000',
        ownerId: 'fakeID',
        payTo: 'ln:123019230jasofdij',
        feePaymentRequest: 'myrequest',
        depositPaymentRequest: 'yourrequest'
      }
      const orderId = 'myid'

      const order = Order.fromStorage(orderId, JSON.stringify(params))

      expect(order).to.have.property('orderId', orderId)
      expect(order).to.have.property('feePaymentRequest', params.feePaymentRequest)
      expect(order).to.have.property('depositPaymentRequest', params.depositPaymentRequest)
    })
  })

  describe('::fromObject', () => {
    it('defines a static method for creating orders from a plain object', () => {
      expect(Order).itself.to.respondTo('fromObject')
    })

    it('creates Orders from a plain object', () => {
      const params = {
        baseSymbol: 'BTC',
        counterSymbol: 'LTC',
        side: 'BID',
        baseAmount: '10000',
        counterAmount: '100000',
        ownerId: 'fakeID',
        payTo: 'ln:123019230jasofdij'
      }
      const orderId = 'myid'

      const order = Order.fromObject(orderId, params)

      expect(order).to.have.property('orderId', orderId)
      expect(order).to.have.property('baseSymbol', params.baseSymbol)
      expect(order).to.have.property('counterSymbol', params.counterSymbol)
      expect(order).to.have.property('side', params.side)
      expect(order).to.have.property('baseAmount', params.baseAmount)
      expect(order).to.have.property('counterAmount', params.counterAmount)
      expect(order).to.have.property('ownerId', params.ownerId)
      expect(order).to.have.property('payTo', params.payTo)
    })

    it('assigns parameters from after order creation to the order object', () => {
      const params = {
        baseSymbol: 'BTC',
        counterSymbol: 'LTC',
        side: 'BID',
        baseAmount: '10000',
        counterAmount: '100000',
        ownerId: 'fakeID',
        payTo: 'ln:123019230jasofdij',
        feePaymentRequest: 'myrequest',
        depositPaymentRequest: 'yourrequest'
      }
      const orderId = 'myid'

      const order = Order.fromObject(orderId, params)

      expect(order).to.have.property('orderId', orderId)
      expect(order).to.have.property('feePaymentRequest', params.feePaymentRequest)
      expect(order).to.have.property('depositPaymentRequest', params.depositPaymentRequest)
    })
  })

  describe('new', () => {
    it('creates an order', () => {
      const params = {
        baseSymbol: 'BTC',
        counterSymbol: 'LTC',
        side: 'BID',
        baseAmount: '10000',
        counterAmount: '100000',
        ownerId: 'fakeID',
        payTo: 'ln:123019230jasofdij'
      }

      const order = new Order(params)

      expect(order).to.have.property('baseSymbol', params.baseSymbol)
      expect(order).to.have.property('counterSymbol', params.counterSymbol)
      expect(order).to.have.property('side', params.side)
      expect(order).to.have.property('baseAmount', params.baseAmount)
      expect(order).to.have.property('counterAmount', params.counterAmount)
      expect(order).to.have.property('ownerId', params.ownerId)
      expect(order).to.have.property('payTo', params.payTo)
    })

    it('creates an ask', () => {
      const params = {
        baseSymbol: 'BTC',
        counterSymbol: 'LTC',
        side: 'ASK',
        baseAmount: '10000',
        counterAmount: '100000',
        ownerId: 'fakeID',
        payTo: 'ln:123019230jasofdij'
      }

      const order = new Order(params)

      expect(order).to.have.property('side', 'ASK')
    })

    it('throws if using an invalid side', () => {
      const params = {
        baseSymbol: 'BTC',
        counterSymbol: 'LTC',
        side: 'BLERGH',
        baseAmount: '10000',
        counterAmount: '100000',
        ownerId: 'fakeID',
        payTo: 'ln:123019230jasofdij'
      }

      expect(() => {
        new Order(params) // eslint-disable-line
      }).to.throw()
    })
  })

  describe('instance', () => {
    let params
    let order

    beforeEach(() => {
      params = {
        baseSymbol: 'BTC',
        counterSymbol: 'LTC',
        side: 'BID',
        baseAmount: '10000',
        counterAmount: '100000',
        ownerId: 'fakeID',
        payTo: 'ln:123019230jasofdij'
      }

      order = new Order(params)
    })

    describe('inbound/outbound getters', () => {
      it('defines an inbound symbol getter', () => {
        expect(order).to.have.property('inboundSymbol', params.baseSymbol)
      })

      it('defines an outbound symbol getter', () => {
        expect(order).to.have.property('outboundSymbol', params.counterSymbol)
      })

      it('defines an inbound amount getter', () => {
        expect(order).to.have.property('inboundAmount', params.baseAmount)
      })

      it('defines an outbound amount getter', () => {
        expect(order).to.have.property('outboundAmount', params.counterAmount)
      })
    })

    describe('get key', () => {
      it('defines a key getter', () => {
        const fakeId = 'fakeId'
        order.orderId = fakeId

        expect(order).to.have.property('key', fakeId)
      })
    })

    describe('get value', () => {
      it('defines a value getter for storage', () => {
        expect(order).to.have.property('value', JSON.stringify(params))
      })
    })

    describe('get valueObject', () => {
      it('defines a getter for retrieving a plain object', () => {
        const valueObject = Object.assign({
          feePaymentRequest: undefined,
          depositPaymentRequest: undefined,
          swapHash: undefined,
          fillAmount: undefined
        }, params)
        expect(order).to.have.property('valueObject')
        expect(order.valueObject).to.be.eql(valueObject)
      })
    })

    describe('get paramsForCreate', () => {
      it('defines a getter for params required to create an order on the relayer', () => {
        expect(order).to.have.property('paramsForCreate')
        expect(order.paramsForCreate).to.be.eql({
          baseSymbol: params.baseSymbol,
          counterSymbol: params.counterSymbol,
          side: params.side,
          baseAmount: params.baseAmount,
          counterAmount: params.counterAmount,
          ownerId: params.ownerId,
          payTo: params.payTo
        })
      })
    })

    describe('#setCreatedParams', () => {
      let createdParams = {
        orderId: 'myid',
        feePaymentRequest: 'myrequest',
        depositPaymentRequest: 'yourrequest'
      }

      it('updates the object with the params from creating on the relayer', () => {
        order.setCreatedParams(createdParams)

        expect(order).to.have.property('orderId', createdParams.orderId)
        expect(order).to.have.property('feePaymentRequest', createdParams.feePaymentRequest)
        expect(order).to.have.property('depositPaymentRequest', createdParams.depositPaymentRequest)
      })

      it('includes the updated params with the saved value', () => {
        order.setCreatedParams(createdParams)

        expect(order.value).to.include(`"feePaymentRequest":"${createdParams.feePaymentRequest}"`)
        expect(order.value).to.include(`"depositPaymentRequest":"${createdParams.depositPaymentRequest}"`)
      })
    })
  })
})
