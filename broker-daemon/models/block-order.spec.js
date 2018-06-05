const { expect, sinon } = require('test/test-helper')
const bigInt = require('big-integer')

const BlockOrder = require('./block-order')
const { OrderStateMachine } = require('../state-machines')

describe('BlockOrder', () => {
  describe('::fromStorage', () => {
    it('defines a static method for creating block orders from storage', () => {
      expect(BlockOrder).itself.to.respondTo('fromStorage')
    })

    it('creates orders from a key and value', () => {
      const params = {
        marketName: 'BTC/LTC',
        side: 'BID',
        amount: '10000',
        price: '100',
        timeInForce: 'GTC',
        status: 'ACTIVE'
      }
      const id = 'myid'

      const blockOrder = BlockOrder.fromStorage(id, JSON.stringify(params))

      expect(blockOrder).to.have.property('id', id)
      expect(blockOrder).to.have.property('marketName', params.marketName)
      expect(blockOrder).to.have.property('side', params.side)
      expect(blockOrder).to.have.property('amount')
      expect(blockOrder.amount.toString()).to.be.equal(params.amount)
      expect(blockOrder).to.have.property('price')
      expect(blockOrder.price.toString()).to.be.equal(params.price)
      expect(blockOrder).to.have.property('timeInForce', params.timeInForce)
      expect(blockOrder).to.have.property('status', params.status)
    })
  })

  describe('new', () => {
    let params

    beforeEach(() => {
      params = {
        id: 'myid',
        marketName: 'BTC/LTC',
        side: 'BID',
        amount: '10000',
        price: '100',
        timeInForce: 'GTC',
        status: 'ACTIVE'
      }
    })

    it('assigns an id', () => {
      const blockOrder = new BlockOrder(params)

      expect(blockOrder).to.have.property('id', params.id)
    })

    it('assigns a market name', () => {
      const blockOrder = new BlockOrder(params)

      expect(blockOrder).to.have.property('marketName', params.marketName)
    })

    it('assigns a side', () => {
      const blockOrder = new BlockOrder(params)

      expect(blockOrder).to.have.property('side', params.side)
    })

    it('converts amount to a big int', () => {
      const blockOrder = new BlockOrder(params)

      expect(blockOrder).to.have.property('amount')
      expect(bigInt.isInstance(blockOrder.amount)).to.be.equal(true)
      expect(blockOrder.amount.toString()).to.be.equal(params.amount)
    })

    it('converts a price to a big int', () => {
      const blockOrder = new BlockOrder(params)

      expect(blockOrder).to.have.property('price')
      expect(bigInt.isInstance(blockOrder.price)).to.be.equal(true)
      expect(blockOrder.price.toString()).to.be.equal(params.price)
    })

    it('assigns a non-existent price as null', () => {
      params.price = undefined

      const blockOrder = new BlockOrder(params)

      expect(blockOrder).to.have.property('price', null)
    })

    it('assigns a time in force', () => {
      const blockOrder = new BlockOrder(params)

      expect(blockOrder).to.have.property('timeInForce', params.timeInForce)
    })

    it('assigns a status', () => {
      const blockOrder = new BlockOrder(params)

      expect(blockOrder).to.have.property('status', params.status)
    })

    it('throws if it has an invalid status', () => {
      params.status = 'OOPS'

      expect(() => {
        new BlockOrder(params) // eslint-disable-line
      }).to.throw()
    })
  })

  describe('instance', () => {
    let params
    let blockOrder

    beforeEach(() => {
      params = {
        id: 'myid',
        marketName: 'BTC/LTC',
        side: 'BID',
        amount: '10000',
        price: '100',
        timeInForce: 'GTC',
        status: 'ACTIVE'
      }

      blockOrder = new BlockOrder(params)
    })

    describe('#serialize', () => {
      it('creates a plain object', () => {
        const serialized = blockOrder.serialize()

        expect(serialized).to.be.an('object')
      })

      it('serializes the market name', () => {
        const serialized = blockOrder.serialize()

        expect(serialized).to.have.property('market', params.marketName)
      })

      it('serializes the side', () => {
        const serialized = blockOrder.serialize()

        expect(serialized).to.have.property('side', params.side)
      })

      it('converts the amount to a string', () => {
        const serialized = blockOrder.serialize()

        expect(serialized).to.have.property('amount', params.amount)
        expect(serialized.amount).to.be.a('string')
      })

      it('converts the price to a string', () => {
        const serialized = blockOrder.serialize()

        expect(serialized).to.have.property('amount', params.amount)
        expect(serialized.amount).to.be.a('string')
      })

      it('provides null if the price is not present', () => {
        params.price = undefined
        blockOrder = new BlockOrder(params)
        const serialized = blockOrder.serialize()

        return expect(serialized.price).to.be.null
      })

      it('serializes the time in force', () => {
        const serialized = blockOrder.serialize()

        expect(serialized).to.have.property('timeInForce', params.timeInForce)
      })

      it('serializes the status', () => {
        const serialized = blockOrder.serialize()

        expect(serialized).to.have.property('status', params.status)
      })

      describe('openOrders', () => {
        let osm

        beforeEach(() => {
          osm = OrderStateMachine.fromStore({
            logger: {
              info: sinon.stub(),
              debug: sinon.stub(),
              error: sinon.stub()
            },
            store: {
              get: sinon.stub(),
              put: sinon.stub(),
              createReadStream: sinon.stub()
            }
          }, { key: 'mykey',
            value: JSON.stringify({
              order: {
                baseSymbol: 'BTC',
                counterSymbol: 'XYZ',
                side: 'BID',
                baseAmount: '1000',
                counterAmount: '10000',
                ownerId: 'fakeID',
                payTo: 'ln:1231243fasdf',
                feePaymentRequest: 'lnbcasodifjoija',
                depositPaymentRequest: 'lnbcaosdifjaosdfj'
              },
              state: 'created',
              history: []
            })})
        })

        it('assigns an empty array if openOrders is not defined', () => {
          const serialized = blockOrder.serialize()

          expect(serialized).to.have.property('openOrders')
          expect(serialized.openOrders).to.be.eql([])
        })

        it('serializes all of the orders', () => {
          blockOrder.openOrders = [ osm ]

          const serialized = blockOrder.serialize()

          expect(serialized.openOrders).to.have.lengthOf(1)
        })

        it('serializes the order id', () => {
          blockOrder.openOrders = [ osm ]

          const serialized = blockOrder.serialize()

          expect(serialized.openOrders[0]).to.have.property('orderId', 'mykey')
        })

        it('serializes the amount', () => {
          blockOrder.openOrders = [ osm ]

          const serialized = blockOrder.serialize()

          expect(serialized.openOrders[0]).to.have.property('amount', '1000')
        })

        it('converts the price', () => {
          blockOrder.openOrders = [ osm ]

          const serialized = blockOrder.serialize()

          expect(serialized.openOrders[0]).to.have.property('price', '10')
        })

        it('serializes the state of the order', () => {
          blockOrder.openOrders = [ osm ]

          const serialized = blockOrder.serialize()

          expect(serialized.openOrders[0]).to.have.property('orderStatus', 'CREATED')
        })
      })
    })

    describe('get key', () => {
      it('defines a key getter', () => {
        expect(blockOrder).to.have.property('key', params.id)
      })
    })

    describe('get value', () => {
      it('defines a value getter for storage', () => {
        const nonKeyParams = Object.assign({}, params)
        delete nonKeyParams.id
        expect(blockOrder).to.have.property('value', JSON.stringify(nonKeyParams))
      })
    })

    describe('get baseSymbol', () => {
      it('dfines a baseSymbol getter', () => {
        expect(blockOrder).to.have.property('baseSymbol', 'BTC')
      })
    })

    describe('get counterSymbol', () => {
      it('defines a counterSymbol getter', () => {
        expect(blockOrder).to.have.property('counterSymbol', 'LTC')
      })
    })
  })
})
