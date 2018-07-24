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
        order: {
          baseSymbol: 'BTC',
          counterSymbol: 'LTC',
          side: 'BID',
          baseAmount: '10000',
          counterAmount: '100000',
          makerBaseAddress: 'bolt:123019230jasofdij',
          makerCounterAddress: 'bolt:65433455asdfasdf'
        }
      }
      const blockOrderId = 'blockid'
      const orderId = 'myid'
      const key = `${blockOrderId}:${orderId}`

      const order = Order.fromStorage(key, JSON.stringify(params))

      expect(order).to.have.property('blockOrderId', blockOrderId)
      expect(order).to.have.property('orderId', orderId)
      expect(order).to.have.property('baseSymbol', params.order.baseSymbol)
      expect(order).to.have.property('counterSymbol', params.order.counterSymbol)
      expect(order).to.have.property('side', params.order.side)
      expect(order).to.have.property('baseAmount', params.order.baseAmount)
      expect(order).to.have.property('counterAmount', params.order.counterAmount)
      expect(order).to.have.property('makerBaseAddress', params.order.makerBaseAddress)
      expect(order).to.have.property('makerCounterAddress', params.order.makerCounterAddress)
    })

    it('assigns parameters from after order creation to the order object', () => {
      const params = {
        order: {
          baseSymbol: 'BTC',
          counterSymbol: 'LTC',
          side: 'BID',
          baseAmount: '10000',
          counterAmount: '100000',
          makerBaseAddress: 'bolt:123019230jasofdij',
          makerCounterAddress: 'bolt:65433455asdfasdf',
          feePaymentRequest: 'myrequest',
          depositPaymentRequest: 'yourrequest'
        }
      }
      const blockOrderId = 'blockid'
      const orderId = 'myid'
      const key = `${blockOrderId}:${orderId}`

      const order = Order.fromStorage(key, JSON.stringify(params))

      expect(order).to.have.property('blockOrderId', blockOrderId)
      expect(order).to.have.property('orderId', orderId)
      expect(order).to.have.property('feePaymentRequest', params.order.feePaymentRequest)
      expect(order).to.have.property('depositPaymentRequest', params.order.depositPaymentRequest)
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
        makerBaseAddress: 'bolt:123019230jasofdij',
        makerCounterAddress: 'bolt:65433455asdfasdf'
      }
      const blockOrderId = 'blockid'
      const orderId = 'myid'
      const key = `${blockOrderId}:${orderId}`

      const order = Order.fromObject(key, params)

      expect(order).to.have.property('blockOrderId', blockOrderId)
      expect(order).to.have.property('orderId', orderId)
      expect(order).to.have.property('baseSymbol', params.baseSymbol)
      expect(order).to.have.property('counterSymbol', params.counterSymbol)
      expect(order).to.have.property('side', params.side)
      expect(order).to.have.property('baseAmount', params.baseAmount)
      expect(order).to.have.property('counterAmount', params.counterAmount)
      expect(order).to.have.property('makerBaseAddress', params.makerBaseAddress)
      expect(order).to.have.property('makerCounterAddress', params.makerCounterAddress)
    })

    it('assigns parameters from after order creation to the order object', () => {
      const params = {
        baseSymbol: 'BTC',
        counterSymbol: 'LTC',
        side: 'BID',
        baseAmount: '10000',
        counterAmount: '100000',
        makerBaseAddress: 'bolt:123019230jasofdij',
        makerCounterAddress: 'bolt:65433455asdfasdf',
        feePaymentRequest: 'myrequest',
        depositPaymentRequest: 'yourrequest'
      }
      const blockOrderId = 'blockid'
      const orderId = 'myid'
      const key = `${blockOrderId}:${orderId}`

      const order = Order.fromObject(key, params)

      expect(order).to.have.property('blockOrderId', blockOrderId)
      expect(order).to.have.property('orderId', orderId)
      expect(order).to.have.property('feePaymentRequest', params.feePaymentRequest)
      expect(order).to.have.property('depositPaymentRequest', params.depositPaymentRequest)
    })
  })

  describe('::rangeForBlockOrder', () => {
    it('creates a range for block orders', () => {
      const blockOrderId = 'blockid'

      expect(Order.rangeForBlockOrder(blockOrderId)).to.be.eql({
        gte: 'blockid:' + '\x00',
        lte: 'blockid:' + '\uffff'
      })
    })
  })

  describe('new', () => {
    it('creates an order', () => {
      const blockOrderId = 'blockid'
      const params = {
        baseSymbol: 'BTC',
        counterSymbol: 'LTC',
        side: 'BID',
        baseAmount: '10000',
        counterAmount: '100000',
        makerBaseAddress: 'bolt:123019230jasofdij',
        makerCounterAddress: 'bolt:65433455asdfasdf'
      }

      const order = new Order(blockOrderId, params)

      expect(order).to.have.property('baseSymbol', params.baseSymbol)
      expect(order).to.have.property('counterSymbol', params.counterSymbol)
      expect(order).to.have.property('side', params.side)
      expect(order).to.have.property('baseAmount', params.baseAmount)
      expect(order).to.have.property('counterAmount', params.counterAmount)
      expect(order).to.have.property('makerBaseAddress', params.makerBaseAddress)
      expect(order).to.have.property('makerCounterAddress', params.makerCounterAddress)
    })

    it('creates an ask', () => {
      const blockOrderId = 'blockid'
      const params = {
        baseSymbol: 'BTC',
        counterSymbol: 'LTC',
        side: 'ASK',
        baseAmount: '10000',
        counterAmount: '100000',
        makerBaseAddress: 'bolt:123019230jasofdij',
        makerCounterAddress: 'bolt:65433455asdfasdf'
      }

      const order = new Order(blockOrderId, params)

      expect(order).to.have.property('side', 'ASK')
    })

    it('throws if using an invalid side', () => {
      const blockOrderId = 'blockid'
      const params = {
        baseSymbol: 'BTC',
        counterSymbol: 'LTC',
        side: 'BLERGH',
        baseAmount: '10000',
        counterAmount: '100000',
        makerBaseAddress: 'bolt:123019230jasofdij',
        makerCounterAddress: 'bolt:65433455asdfasdf'
      }

      expect(() => {
        new Order(blockOrderId, params) // eslint-disable-line
      }).to.throw()
    })
  })

  describe('instance', () => {
    let params
    let order
    let blockOrderId

    beforeEach(() => {
      blockOrderId = 'blockid'
      params = {
        baseSymbol: 'BTC',
        counterSymbol: 'LTC',
        side: 'BID',
        baseAmount: '10000',
        counterAmount: '100000',
        makerBaseAddress: 'bolt:123019230jasofdij',
        makerCounterAddress: 'bolt:65433455asdfasdf'
      }

      order = new Order(blockOrderId, params)
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

        expect(order).to.have.property('key', `${blockOrderId}:${fakeId}`)
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
          fillAmount: undefined,
          takerAddress: undefined
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
          makerBaseAddress: params.makerBaseAddress,
          makerCounterAddress: params.makerCounterAddress
        })
      })
    })

    describe('get paramsForPrepareSwap', () => {
      it('defines a getter for params required to prepare a swap in an engine', () => {
        const swapHash = 'asoifdjaofj02309832'
        const fakeId = 'myid'
        Object.assign(order, { swapHash, orderId: fakeId })

        expect(order).to.have.property('paramsForPrepareSwap')
        expect(order.paramsForPrepareSwap).to.be.eql({
          orderId: fakeId,
          swapHash: swapHash,
          symbol: params.baseSymbol,
          amount: params.baseAmount
        })
      })

      it('throws an error if a param is missing', () => {
        expect(() => order.paramsForPrepareSwap).to.throw()
      })
    })

    describe('get paramsForGetPreimage', () => {
      it('defines a getter for params required to prepare a swap in an engine', () => {
        const swapHash = 'asoifdjaofj02309832'
        Object.assign(order, { swapHash })

        expect(order).to.have.property('paramsForGetPreimage')
        expect(order.paramsForGetPreimage).to.be.eql({
          swapHash: swapHash,
          symbol: params.baseSymbol
        })
      })

      it('throws an error if a param is missing', () => {
        expect(() => order.paramsForGetPreimage).to.throw()
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

    describe('#setFilledParams', () => {
      let filledParams = {
        swapHash: 'asdfjasofj9s8fu',
        fillAmount: '10000',
        takerAddress: 'bolt:123192380asfasdf@localhost'
      }

      it('updates the object with the params from creating on the relayer', () => {
        order.setFilledParams(filledParams)

        expect(order).to.have.property('swapHash', filledParams.swapHash)
        expect(order).to.have.property('fillAmount', filledParams.fillAmount)
        expect(order).to.have.property('takerAddress', filledParams.takerAddress)
      })

      it('includes the updated params with the saved value', () => {
        order.setFilledParams(filledParams)

        expect(order.value).to.include(`"swapHash":"${filledParams.swapHash}"`)
        expect(order.value).to.include(`"fillAmount":"${filledParams.fillAmount}"`)
        expect(order.value).to.include(`"takerAddress":"${filledParams.takerAddress}"`)
      })
    })
  })
})
