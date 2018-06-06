const path = require('path')
const { expect, rewire } = require('test/test-helper')

const Fill = rewire(path.resolve(__dirname, 'fill'))

describe('Fill', () => {
  let Order

  beforeEach(() => {
    Order = {
      SIDES: {
        BID: 'BID',
        ASK: 'ASK'
      }
    }

    Fill.__set__('Order', Order)
  })

  describe('::fromStorage', () => {
    it('defines a static method for creating fills from storage', () => {
      expect(Fill).itself.to.respondTo('fromStorage')
    })

    it('creates orders from a key and value', () => {
      const params = {
        order: {
          orderId: 'fakeID',
          baseSymbol: 'BTC',
          counterSymbol: 'LTC',
          side: 'BID',
          baseAmount: '10000',
          counterAmount: '100000'
        },
        fillAmount: '9000',
        swapHash: 'asdfasdf'
      }
      const fillId = 'myid'

      const fill = Fill.fromStorage(fillId, JSON.stringify(params))

      expect(fill).to.have.property('fillId', fillId)
      expect(fill).to.have.property('fillAmount', params.fillAmount)
      expect(fill).to.have.property('swapHash', params.swapHash)
      expect(fill).to.have.property('order')
      expect(fill.order).to.have.property('baseSymbol', params.order.baseSymbol)
      expect(fill.order).to.have.property('counterSymbol', params.order.counterSymbol)
      expect(fill.order).to.have.property('side', params.order.side)
      expect(fill.order).to.have.property('baseAmount', params.order.baseAmount)
      expect(fill.order).to.have.property('counterAmount', params.order.counterAmount)
    })

    it('assigns parameters from after fill creation to the fill object', () => {
      const params = {
        order: {
          orderId: 'fakeID',
          baseSymbol: 'BTC',
          counterSymbol: 'LTC',
          side: 'BID',
          baseAmount: '10000',
          counterAmount: '100000'
        },
        fillAmount: '9000',
        swapHash: 'asdfasdf',
        feePaymentRequest: 'myrequest',
        depositPaymentRequest: 'yourrequest'
      }
      const fillId = 'myid'

      const fill = Fill.fromStorage(fillId, JSON.stringify(params))

      expect(fill).to.have.property('fillId', fillId)
      expect(fill).to.have.property('feePaymentRequest', params.feePaymentRequest)
      expect(fill).to.have.property('depositPaymentRequest', params.depositPaymentRequest)
    })
  })

  describe('::fromObject', () => {
    it('defines a static method for creating orders from a plain object', () => {
      expect(Fill).itself.to.respondTo('fromObject')
    })

    it('creates Fills from a plain object', () => {
      const params = {
        order: {
          orderId: 'fakeID',
          baseSymbol: 'BTC',
          counterSymbol: 'LTC',
          side: 'BID',
          baseAmount: '10000',
          counterAmount: '100000'
        },
        fillAmount: '9000',
        swapHash: 'asdfasdf'
      }
      const fillId = 'myid'

      const fill = Fill.fromObject(fillId, params)

      expect(fill).to.have.property('fillId', fillId)
      expect(fill).to.have.property('fillAmount', params.fillAmount)
      expect(fill).to.have.property('swapHash', params.swapHash)
      expect(fill).to.have.property('order')
      expect(fill.order).to.have.property('baseSymbol', params.order.baseSymbol)
      expect(fill.order).to.have.property('counterSymbol', params.order.counterSymbol)
      expect(fill.order).to.have.property('side', params.order.side)
      expect(fill.order).to.have.property('baseAmount', params.order.baseAmount)
      expect(fill.order).to.have.property('counterAmount', params.order.counterAmount)
    })

    it('assigns parameters from after order creation to the order object', () => {
      const params = {
        order: {
          orderId: 'fakeID',
          baseSymbol: 'BTC',
          counterSymbol: 'LTC',
          side: 'BID',
          baseAmount: '10000',
          counterAmount: '100000'
        },
        fillAmount: '9000',
        swapHash: 'asdfasdf',
        feePaymentRequest: 'myrequest',
        depositPaymentRequest: 'yourrequest'
      }
      const fillId = 'myid'

      const fill = Fill.fromObject(fillId, params)

      expect(fill).to.have.property('fillId', fillId)
      expect(fill).to.have.property('feePaymentRequest', params.feePaymentRequest)
      expect(fill).to.have.property('depositPaymentRequest', params.depositPaymentRequest)
    })
  })

  describe('new', () => {
    it('creates an fill', () => {
      const order = {
        orderId: 'fakeId',
        baseSymbol: 'BTC',
        counterSymbol: 'LTC',
        side: 'BID',
        baseAmount: '10000',
        counterAmount: '100000'
      }
      const params = {
        fillAmount: '9000'
      }

      const fill = new Fill(order, params)

      expect(fill).to.have.property('fillAmount', params.fillAmount)
      expect(fill).to.have.property('order')
      expect(fill.order).to.have.property('orderId', order.orderId)
      expect(fill.order).to.have.property('baseSymbol', order.baseSymbol)
      expect(fill.order).to.have.property('counterSymbol', order.counterSymbol)
      expect(fill.order).to.have.property('side', order.side)
      expect(fill.order).to.have.property('baseAmount', order.baseAmount)
      expect(fill.order).to.have.property('counterAmount', order.counterAmount)
    })

    it('throws if using an invalid side', () => {
      const order = {
        orderId: '1asdf',
        baseSymbol: 'BTC',
        counterSymbol: 'LTC',
        side: 'BLERGH',
        baseAmount: '10000',
        counterAmount: '100000'
      }

      const params = {
        fillAmount: '9000'
      }

      expect(() => {
        new Fill(order, params) // eslint-disable-line
      }).to.throw()
    })
  })

  describe('instance', () => {
    let params
    let fill
    let order

    beforeEach(() => {
      order = {
        orderId: 'fakeId',
        baseSymbol: 'BTC',
        counterSymbol: 'LTC',
        side: 'BID',
        baseAmount: '10000',
        counterAmount: '100000'
      }
      params = {
        fillAmount: '9000'
      }

      fill = new Fill(order, params)
    })

    describe('inbound/outbound getters', () => {
      it('defines an inbound symbol getter', () => {
        expect(fill).to.have.property('inboundSymbol', order.counterSymbol)
      })

      it('defines an outbound symbol getter', () => {
        expect(fill).to.have.property('outboundSymbol', order.baseSymbol)
      })

      it('defines an inbound amount getter', () => {
        expect(fill).to.have.property('inboundAmount', '90000')
      })

      it('defines an outbound amount getter', () => {
        expect(fill).to.have.property('outboundAmount', params.fillAmount)
      })
    })

    describe('amount getters', () => {
      it('defines a baseFillAmount getter', () => {
        expect(fill).to.have.property('baseFillAmount', params.fillAmount)
      })

      it('defines a counterFillAmount getter', () => {
        expect(fill).to.have.property('counterFillAmount', '90000')
      })
    })

    describe('get key', () => {
      it('defines a key getter', () => {
        const fakeId = 'fakeId'
        fill.fillId = fakeId

        expect(fill).to.have.property('key', fakeId)
      })
    })

    describe('get value', () => {
      it('defines a value getter for storage', () => {
        expect(fill).to.have.property('value', JSON.stringify(Object.assign({}, { order }, params)))
      })
    })

    describe('get valueObject', () => {
      it('defines a getter for retrieving a plain object', () => {
        const valueObject = Object.assign({
          feePaymentRequest: undefined,
          depositPaymentRequest: undefined,
          swapHash: undefined
        }, params, { order })
        expect(fill).to.have.property('valueObject')
        expect(fill.valueObject).to.be.eql(valueObject)
      })
    })

    describe('#addSwapHash', () => {
      let swapHash = 'fakeSwapHash'

      it('updates the object with the swap hash', () => {
        fill.addSwapHash(swapHash)
        expect(fill).to.have.property('swapHash', swapHash)
      })

      it('includes the updated params in the saved value', () => {
        fill.addSwapHash(swapHash)
        expect(fill.value).to.include(`"swapHash":"${swapHash}"`)
      })
    })

    describe('get createParams', () => {
      it('defines a getter for params required to create a fill on the relayer', () => {
        const fakeSwapHash = 'hello'
        fill.addSwapHash(fakeSwapHash)
        expect(fill).to.have.property('createParams')
        expect(fill.createParams).to.be.eql({
          orderId: order.orderId,
          swapHash: fakeSwapHash,
          fillAmount: params.fillAmount
        })
      })
    })

    describe('#addCreatedParams', () => {
      let createdParams = {
        fillId: 'myid',
        feePaymentRequest: 'myrequest',
        depositPaymentRequest: 'yourrequest'
      }

      it('updates the object with the params from creating on the relayer', () => {
        fill.addCreatedParams(createdParams)

        expect(fill).to.have.property('fillId', createdParams.fillId)
        expect(fill).to.have.property('feePaymentRequest', createdParams.feePaymentRequest)
        expect(fill).to.have.property('depositPaymentRequest', createdParams.depositPaymentRequest)
      })

      it('includes the updated params with the saved value', () => {
        fill.addCreatedParams(createdParams)

        expect(fill.value).to.include(`"feePaymentRequest":"${createdParams.feePaymentRequest}"`)
        expect(fill.value).to.include(`"depositPaymentRequest":"${createdParams.depositPaymentRequest}"`)
      })
    })
  })
})
