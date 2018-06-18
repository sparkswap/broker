const { expect, sinon } = require('test/test-helper')
const { Big } = require('../utils')

const BlockOrder = require('./block-order')
const { OrderStateMachine, FillStateMachine } = require('../state-machines')

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

    it('throws if it has an invalid status', () => {
      const id = 'myid'
      const params = {
        marketName: 'BTC/LTC',
        side: 'BID',
        amount: '10000',
        price: '100',
        timeInForce: 'GTC',
        status: 'OOPS'
      }

      expect(() => {
        BlockOrder.fromStorage(id, JSON.stringify(params))
      }).to.throw()
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
        timeInForce: 'GTC'
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

    it('throws if it has an invalid time restriction', () => {
      params.timeInForce = undefined

      expect(() => {
        new BlockOrder(params) // eslint-disable-line
      }).to.throw()
    })

    it('throws if it does not have an amouont', () => {
      params.amount = undefined

      expect(() => {
        new BlockOrder(params) // eslint-disable-line
      }).to.throw()
    })

    it('converts amount to a Big.js', () => {
      const blockOrder = new BlockOrder(params)

      expect(blockOrder).to.have.property('amount')
      expect(blockOrder.amount).to.be.instanceOf(Big)
      expect(blockOrder.amount.toString()).to.be.equal(params.amount)
    })

    it('converts a price to a Big.js', () => {
      const blockOrder = new BlockOrder(params)

      expect(blockOrder).to.have.property('price')
      expect(blockOrder.price).to.be.instanceOf(Big)
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
      params.status = 'CANCELLED'
      const blockOrder = new BlockOrder(params)

      expect(blockOrder).to.have.property('status', params.status)
    })

    it('defaults to active status', () => {
      const blockOrder = new BlockOrder(params)

      expect(blockOrder).to.have.property('status', 'ACTIVE')
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

    describe('#fail', () => {
      it('moves the block order to a failed state', () => {
        blockOrder.fail()

        expect(blockOrder).to.have.property('status', 'FAILED')
      })
    })

    describe('#cancel', () => {
      it('moves the block order to a cancelled state', () => {
        blockOrder.cancel()

        expect(blockOrder).to.have.property('status', 'CANCELLED')
      })
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

          expect(serialized.openOrders[0]).to.have.property('price')
          expect(serialized.openOrders[0].price).to.be.eql('10.0000000000000000')
        })

        it('serializes the state of the order', () => {
          blockOrder.openOrders = [ osm ]

          const serialized = blockOrder.serialize()

          expect(serialized.openOrders[0]).to.have.property('orderStatus', 'CREATED')
        })
      })

      describe('fills', () => {
        let fsm

        beforeEach(() => {
          fsm = FillStateMachine.fromStore({
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
              fill: {
                order: {
                  orderId: 'otherkey',
                  baseSymbol: 'BTC',
                  counterSymbol: 'XYZ',
                  side: 'BID',
                  baseAmount: '1000',
                  counterAmount: '10000'
                },
                fillAmount: '900',
                feePaymentRequest: 'lnbcasodifjoija',
                depositPaymentRequest: 'lnbcaosdifjaosdfj'
              },
              state: 'created',
              history: []
            })})
        })

        it('assigns an empty array if fills is not defined', () => {
          const serialized = blockOrder.serialize()

          expect(serialized).to.have.property('fills')
          expect(serialized.fills).to.be.eql([])
        })

        it('serializes all of the fills', () => {
          blockOrder.fills = [ fsm ]

          const serialized = blockOrder.serialize()

          expect(serialized.fills).to.have.lengthOf(1)
        })

        it('serializes the fill id', () => {
          blockOrder.fills = [ fsm ]

          const serialized = blockOrder.serialize()

          expect(serialized.fills[0]).to.have.property('fillId', 'mykey')
        })

        it('serializes the order id', () => {
          blockOrder.fills = [ fsm ]

          const serialized = blockOrder.serialize()

          expect(serialized.fills[0]).to.have.property('orderId', 'otherkey')
        })

        it('serializes the amount', () => {
          blockOrder.fills = [ fsm ]

          const serialized = blockOrder.serialize()

          expect(serialized.fills[0]).to.have.property('amount', '900')
        })

        it('converts the price', () => {
          blockOrder.fills = [ fsm ]

          const serialized = blockOrder.serialize()

          expect(serialized.fills[0]).to.have.property('price')
          expect(serialized.fills[0].price).to.be.eql('10.0000000000000000')
        })

        it('serializes the state of the fill', () => {
          blockOrder.fills = [ fsm ]

          const serialized = blockOrder.serialize()

          expect(serialized.fills[0]).to.have.property('fillStatus', 'CREATED')
        })
      })
    })

    describe('#serializeSummary', () => {
      it('creates a plain object', () => {
        const serialized = blockOrder.serializeSummary()

        expect(serialized).to.be.an('object')
      })

      it('serializes the market name', () => {
        const serialized = blockOrder.serializeSummary()

        expect(serialized).to.have.property('market', params.marketName)
      })

      it('serializes the side', () => {
        const serialized = blockOrder.serializeSummary()

        expect(serialized).to.have.property('side', params.side)
      })

      it('converts the amount to a string', () => {
        const serialized = blockOrder.serializeSummary()

        expect(serialized).to.have.property('amount', params.amount)
        expect(serialized.amount).to.be.a('string')
      })

      it('converts the price to a string', () => {
        const serialized = blockOrder.serializeSummary()

        expect(serialized).to.have.property('amount', params.amount)
        expect(serialized.amount).to.be.a('string')
      })

      it('provides null if the price is not present', () => {
        params.price = undefined
        blockOrder = new BlockOrder(params)
        const serialized = blockOrder.serializeSummary()

        return expect(serialized.price).to.be.null
      })

      it('serializes the time in force', () => {
        const serialized = blockOrder.serializeSummary()

        expect(serialized).to.have.property('timeInForce', params.timeInForce)
      })

      it('serializes the status', () => {
        const serialized = blockOrder.serializeSummary()

        expect(serialized).to.have.property('status', params.status)
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

    describe('get inverseSide', () => {
      it('defines an inverse side getter', () => {
        expect(blockOrder).to.have.property('inverseSide', 'ASK')
      })
    })

    describe('get baseAmount', () => {
      it('defines a baseAmount that aliases the amount', () => {
        expect(blockOrder).to.have.property('baseAmount', params.amount)
      })
    })

    describe('get counterAmount', () => {
      it('calculates the counterAmount', () => {
        expect(blockOrder).to.have.property('counterAmount', '1000000')
      })

      it('returns undefined if no price is defined', () => {
        params.price = undefined
        blockOrder = new BlockOrder(params)

        expect(blockOrder).to.have.property('counterAmount', undefined)
      })
    })
  })
})
