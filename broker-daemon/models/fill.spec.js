const path = require('path')
const { expect, rewire } = require('test/test-helper')

const Fill = rewire(path.resolve(__dirname, 'fill'))

describe('Fill', () => {
  let Order
  let CONFIG

  beforeEach(() => {
    Order = {
      SIDES: {
        BID: 'BID',
        ASK: 'ASK'
      }
    }

    CONFIG = {
      currencies: [
        {
          symbol: 'BTC',
          quantumsPerCommon: '100000000'
        },
        {
          symbol: 'XYZ',
          quantumsPerCommon: '10000'
        },
        {
          symbol: 'LTC',
          quantumsPerCommon: '100000000'
        }
      ]
    }

    Fill.__set__('CONFIG', CONFIG)
    Fill.__set__('Order', Order)
  })

  describe('::fromStorage', () => {
    it('defines a static method for creating fills from storage', () => {
      expect(Fill).itself.to.respondTo('fromStorage')
    })

    it('creates orders from a key and value', () => {
      const params = {
        fill: {
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
      }
      const blockOrderId = 'blockid'
      const fillId = 'myid'
      const key = `${blockOrderId}:${fillId}`

      const fill = Fill.fromStorage(key, JSON.stringify(params))

      expect(fill).to.have.property('blockOrderId', blockOrderId)
      expect(fill).to.have.property('fillId', fillId)
      expect(fill).to.have.property('fillAmount', params.fill.fillAmount)
      expect(fill).to.have.property('swapHash', params.fill.swapHash)
      expect(fill).to.have.property('order')
      expect(fill.order).to.have.property('baseSymbol', params.fill.order.baseSymbol)
      expect(fill.order).to.have.property('counterSymbol', params.fill.order.counterSymbol)
      expect(fill.order).to.have.property('side', params.fill.order.side)
      expect(fill.order).to.have.property('baseAmount', params.fill.order.baseAmount)
      expect(fill.order).to.have.property('counterAmount', params.fill.order.counterAmount)
    })

    it('assigns parameters from after fill creation to the fill object', () => {
      const params = {
        fill: {
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
          feeRequired: true,
          depositPaymentRequest: 'yourrequest',
          depositRequired: true
        }
      }
      const blockOrderId = 'blockid'
      const fillId = 'myid'
      const key = `${blockOrderId}:${fillId}`

      const fill = Fill.fromStorage(key, JSON.stringify(params))

      expect(fill).to.have.property('fillId', fillId)
      expect(fill).to.have.property('feePaymentRequest', params.fill.feePaymentRequest)
      expect(fill).to.have.property('feeRequired', params.fill.feeRequired)
      expect(fill).to.have.property('depositPaymentRequest', params.fill.depositPaymentRequest)
      expect(fill).to.have.property('depositRequired', params.fill.depositRequired)
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
      const blockOrderId = 'blockid'
      const fillId = 'myid'
      const key = `${blockOrderId}:${fillId}`

      const fill = Fill.fromObject(key, params)

      expect(fill).to.have.property('blockOrderId', blockOrderId)
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
        feeRequired: true,
        depositPaymentRequest: 'yourrequest',
        depositRequired: true
      }
      const blockOrderId = 'blockid'
      const fillId = 'myid'
      const key = `${blockOrderId}:${fillId}`

      const fill = Fill.fromObject(key, params)

      expect(fill).to.have.property('fillId', fillId)
      expect(fill).to.have.property('feePaymentRequest', params.feePaymentRequest)
      expect(fill).to.have.property('feeRequired', params.feeRequired)
      expect(fill).to.have.property('depositPaymentRequest', params.depositPaymentRequest)
      expect(fill).to.have.property('depositRequired', params.depositRequired)
    })
  })

  describe('::rangeForBlockOrder', () => {
    it('creates a range for block orders', () => {
      const blockOrderId = 'blockid'

      expect(Fill.rangeForBlockOrder(blockOrderId)).to.be.eql({
        gte: 'blockid:' + '\x00',
        lte: 'blockid:' + '\uffff'
      })
    })
  })

  describe('new', () => {
    it('creates an fill', () => {
      const blockOrderId = 'blockid'
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

      const fill = new Fill(blockOrderId, order, params)

      expect(fill).to.have.property('blockOrderId', blockOrderId)
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
      const blockOrderId = 'blockid'
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
        new Fill(blockOrderId, order, params) // eslint-disable-line
      }).to.throw()
    })
  })

  describe('instance', () => {
    let params
    let fill
    let order
    let blockOrderId

    beforeEach(() => {
      blockOrderId = 'blockid'
      order = {
        orderId: 'fakeId',
        baseSymbol: 'BTC',
        counterSymbol: 'LTC',
        side: 'BID',
        baseAmount: '10000',
        counterAmount: '100000'
      }
      params = {
        fillAmount: '9000',
        takerBaseAddress: 'bolt:asdfasdf',
        takerCounterAddress: 'bolt:zxcvzxcv'
      }

      fill = new Fill(blockOrderId, order, params)
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

        expect(fill).to.have.property('key', `${blockOrderId}:${fakeId}`)
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
          feeRequired: undefined,
          depositPaymentRequest: undefined,
          depositRequired: undefined,
          swapHash: undefined,
          makerAddress: undefined
        }, params, { order })
        expect(fill).to.have.property('valueObject')
        expect(fill.valueObject).to.be.eql(valueObject)
      })
    })

    describe('#setSwapHash', () => {
      let swapHash = 'fakeSwapHash'

      it('updates the object with the swap hash', () => {
        fill.setSwapHash(swapHash)
        expect(fill).to.have.property('swapHash', swapHash)
      })

      it('includes the updated params in the saved value', () => {
        fill.setSwapHash(swapHash)
        expect(fill.value).to.include(`"swapHash":"${swapHash}"`)
      })
    })

    describe('get paramsForCreate', () => {
      it('defines a getter for params required to create a fill on the relayer', () => {
        const fakeSwapHash = 'hello'
        fill.setSwapHash(fakeSwapHash)
        expect(fill).to.have.property('paramsForCreate')
        expect(fill.paramsForCreate).to.be.eql({
          orderId: order.orderId,
          swapHash: fakeSwapHash,
          fillAmount: params.fillAmount,
          takerBaseAddress: 'bolt:asdfasdf',
          takerCounterAddress: 'bolt:zxcvzxcv'
        })
      })
    })

    describe('get paramsForFill', () => {
      it('defines a getter for params required to create a fill on the relayer', () => {
        let createdParams = {
          fillId: 'myid',
          feePaymentRequest: 'myrequest',
          feeRequired: true,
          depositPaymentRequest: 'yourrequest',
          depositRequired: false
        }
        fill.setCreatedParams(createdParams)

        expect(fill).to.have.property('paramsForFill')
        expect(fill.paramsForFill).to.be.eql({
          fillId: createdParams.fillId,
          feePaymentRequest: createdParams.feePaymentRequest,
          feeRequired: createdParams.feeRequired,
          depositPaymentRequest: createdParams.depositPaymentRequest,
          depositRequired: createdParams.depositRequired,
          outboundSymbol: order.baseSymbol
        })
      })
    })

    describe('get paramsForSwap', () => {
      it('defines a getter for params required to execute a swap with the engine', () => {
        const fakeSwapHash = 'hello'
        fill.setSwapHash(fakeSwapHash)

        const fakeMakerAddress = 'bolt:asd0f9uasf09u'
        fill.setExecuteParams({ makerAddress: fakeMakerAddress })

        expect(fill).to.have.property('paramsForSwap')
        expect(fill.paramsForSwap).to.be.eql({
          makerAddress: 'bolt:asd0f9uasf09u',
          swapHash: fakeSwapHash,
          symbol: fill.outboundSymbol,
          amount: fill.outboundAmount
        })
      })
    })

    describe('#setCreatedParams', () => {
      let createdParams = {
        fillId: 'myid',
        feePaymentRequest: 'myrequest',
        feeRequired: true,
        depositPaymentRequest: 'yourrequest',
        depositRequired: true
      }

      it('updates the object with the params from creating on the relayer', () => {
        fill.setCreatedParams(createdParams)

        expect(fill).to.have.property('fillId', createdParams.fillId)
        expect(fill).to.have.property('feePaymentRequest', createdParams.feePaymentRequest)
        expect(fill).to.have.property('feeRequired', createdParams.feeRequired)
        expect(fill).to.have.property('depositPaymentRequest', createdParams.depositPaymentRequest)
        expect(fill).to.have.property('depositRequired', createdParams.depositRequired)
      })

      it('includes the updated params with the saved value', () => {
        fill.setCreatedParams(createdParams)

        expect(fill.value).to.include(`"feePaymentRequest":"${createdParams.feePaymentRequest}"`)
        expect(fill.value).to.include(`"feeRequired":${createdParams.feeRequired}`)
        expect(fill.value).to.include(`"depositPaymentRequest":"${createdParams.depositPaymentRequest}"`)
        expect(fill.value).to.include(`"depositRequired":${createdParams.depositRequired}`)
      })
    })

    describe('#setExecuteParams', () => {
      let executeParams = {
        makerAddress: 'bolt:asoifjaosfij'
      }

      it('updates the object with the params from creating on the relayer', () => {
        fill.setExecuteParams(executeParams)

        expect(fill).to.have.property('makerAddress', executeParams.makerAddress)
      })

      it('includes the updated params with the saved value', () => {
        fill.setExecuteParams(executeParams)

        expect(fill.value).to.include(`"makerAddress":"${executeParams.makerAddress}"`)
      })
    })

    describe('serialize', () => {
      it('returns a serialized version of the fill', () => {
        const serializedFill = fill.serialize()

        expect(serializedFill).to.have.property('blockOrderId', fill.blockOrderId)
        expect(serializedFill).to.have.property('fillId', fill.fillId)
        expect(serializedFill).to.have.property('amount', '0.0000900000000000')
        expect(serializedFill).to.have.property('baseSymbol', fill.order.baseSymbol)
        expect(serializedFill).to.have.property('counterSymbol', fill.order.counterSymbol)
        expect(serializedFill).to.have.property('side', fill.order.side)
        expect(serializedFill).to.have.property('price', '10.0000000000000000')
      })
    })
  })
})
