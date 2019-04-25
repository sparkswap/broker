const path = require('path')
const { expect, sinon, rewire } = require('test/test-helper')
const { Big } = require('../utils')

const BlockOrder = rewire(path.resolve(__dirname, 'block-order'))
const { BlockOrderNotFoundError } = require('./errors')

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
        timestamp: '1234',
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
      expect(blockOrder).to.have.property('timestamp', params.timestamp)
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

    it('throws if using too high of precision for amount', () => {
      const id = 'myid'
      const params = {
        marketName: 'BTC/LTC',
        side: 'BID',
        amount: '10000.098098080980980808081203810293810938',
        price: '100',
        timeInForce: 'GTC',
        status: 'CREATED'
      }

      expect(() => {
        BlockOrder.fromStorage(id, JSON.stringify(params))
      }).to.throw()
    })
  })

  describe('::fromStore', () => {
    let promisifyStore
    let blockOrder
    let blockOrderStub
    let fromStorageStub
    let serializedBlockOrder
    let storeGetStub
    let storeStub

    let revert

    beforeEach(() => {
      blockOrder = { blockOrderId: 1234 }
      blockOrderStub = sinon.stub().returns(blockOrder)
      promisifyStore = sinon.stub().returns(blockOrderStub)
      serializedBlockOrder = sinon.stub()
      fromStorageStub = sinon.stub().returns(serializedBlockOrder)
      storeGetStub = sinon.stub()
      storeStub = {
        get: storeGetStub
      }

      revert = BlockOrder.__set__('promisify', promisifyStore)
      BlockOrder.fromStorage = fromStorageStub
    })

    afterEach(() => {
      revert()
    })

    it('defines a static method for creating block orders from storage', () => {
      expect(BlockOrder).itself.to.respondTo('fromStore')
    })

    it('throws an error if a store is not defined', () => {
      return expect(BlockOrder.fromStore()).to.eventually.be.rejectedWith('No store is defined')
    })

    it('throws a BlockOrderNotFoundError if the record is not found', () => {
      const error = new Error('BAD')
      error.notFound = true
      blockOrderStub.throws(error)
      expect(BlockOrder.fromStore(storeStub)).to.eventually.be.rejectedWith(BlockOrderNotFoundError)
    })

    it('deserializes a blockorder from leveldb', async () => {
      await BlockOrder.fromStore(storeStub, blockOrder.blockOrderId)
      expect(fromStorageStub).to.have.been.calledWith(blockOrder.blockOrderId, sinon.match.any)
    })

    it('returns a blockorder', async () => {
      const res = await BlockOrder.fromStore(storeStub, blockOrder.blockOrderId)
      expect(promisifyStore).to.have.been.calledWith(storeStub.get)
      expect(blockOrderStub).to.have.been.calledWith(blockOrder.blockOrderId)
      expect(res).to.be.eql(serializedBlockOrder)
    })
  })

  describe('new', () => {
    let params
    let nanoStub
    let timestamp
    let revert

    beforeEach(() => {
      timestamp = 'timestamp'
      nanoStub = sinon.stub().returns(timestamp)
      params = {
        id: 'myid',
        marketName: 'BTC/LTC',
        side: 'BID',
        amount: '10000',
        price: '100',
        timeInForce: 'GTC'
      }
      revert = BlockOrder.__set__('nano', { toString: nanoStub })
    })

    afterEach(() => {
      revert()
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

    it('creates a timestamp', () => {
      const blockOrder = new BlockOrder(params)
      expect(blockOrder).to.have.property('timestamp', timestamp)
      expect(nanoStub).to.have.been.calledOnce()
    })

    it('creates a timestamp from a property passed in through params', () => {
      const newTimestamp = 'newtimestamp'
      params.timestamp = newTimestamp
      const blockOrder = new BlockOrder(params)
      expect(blockOrder).to.not.have.property('timestamp', timestamp)
      expect(blockOrder).to.have.property('timestamp', newTimestamp)
      expect(nanoStub).to.not.have.been.calledOnce()
    })
  })

  describe('instance', () => {
    let params
    let blockOrder
    let CONFIG
    let nanoToDatetimeStub
    let timestamp
    let Order
    let Fill
    let OrderStateMachine
    let FillStateMachine

    let reverts = []

    beforeEach(() => {
      timestamp = 'timestamp'
      nanoToDatetimeStub = sinon.stub().returns(timestamp)
      params = {
        id: 'myid',
        marketName: 'BTC/LTC',
        side: 'BID',
        amount: '10000',
        price: '100',
        timeInForce: 'GTC',
        timestamp,
        status: 'ACTIVE'
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
      Order = {
        fromObject: sinon.stub(),
        fromStorage: sinon.stub(),
        rangeForBlockOrder: sinon.stub()
      }
      OrderStateMachine = {
        serialize: sinon.stub(),
        STATES: {
          NONE: 'none',
          CREATED: 'created',
          PLACED: 'placed',
          CANCELLED: 'cancelled',
          EXECUTING: 'executing',
          COMPLETED: 'completed',
          REJECTED: 'rejected'
        }
      }

      FillStateMachine = {
        serialize: sinon.stub(),
        STATES: {
          NONE: 'none',
          CREATED: 'created',
          FILLED: 'filled',
          EXECUTED: 'executed',
          CANCELLED: 'cancelled',
          REJECTED: 'rejected'
        }
      }

      BlockOrder.__set__('Order', Order)

      Fill = {
        fromObject: sinon.stub(),
        rangeForBlockOrder: sinon.stub()
      }

      BlockOrder.__set__('Fill', Fill)

      reverts.push(BlockOrder.__set__('CONFIG', CONFIG))
      reverts.push(BlockOrder.__set__('nanoToDatetime', nanoToDatetimeStub))
      reverts.push(BlockOrder.__set__('OrderStateMachine', OrderStateMachine))
      reverts.push(BlockOrder.__set__('FillStateMachine', FillStateMachine))

      blockOrder = new BlockOrder(params)
    })

    afterEach(() => {
      reverts.forEach(r => r())
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

        expect(serialized).to.have.property('amount', '10000.0000000000000000')
        expect(serialized.amount).to.be.a('string')
      })

      it('converts the price to a string', () => {
        const serialized = blockOrder.serialize()

        expect(serialized).to.have.property('limitPrice', '100.0000000000000000')
      })

      it('provides null if the price is not present', () => {
        params.price = undefined
        blockOrder = new BlockOrder(params)
        const serialized = blockOrder.serialize()

        return expect(serialized.limitPrice).to.be.null
      })

      it('returns a market price if the price is not present', () => {
        params.price = undefined

        blockOrder = new BlockOrder(params)
        const serialized = blockOrder.serialize()

        expect(serialized.isMarketOrder).to.be.eql(true)
      })

      it('serializes the time in force', () => {
        const serialized = blockOrder.serialize()

        expect(serialized).to.have.property('timeInForce', params.timeInForce)
      })

      it('serializes the status', () => {
        const serialized = blockOrder.serialize()

        expect(serialized).to.have.property('status', params.status)
      })

      describe('orders', () => {
        let osm

        beforeEach(() => {
          osm = {
            order: {
              orderId: 'mykey',
              baseSymbol: 'BTC',
              counterSymbol: 'XYZ',
              side: 'BID',
              baseAmount: '1000',
              counterAmount: '10000',
              makerAddress: 'bolt:1231243fasdf',
              feePaymentRequest: 'lnbcasodifjoija',
              depositPaymentRequest: 'lnbcaosdifjaosdfj'
            },
            state: 'created'
          }
        })

        it('assigns an empty array if orders is not defined', () => {
          const serialized = blockOrder.serialize()

          expect(serialized).to.have.property('orders')
          expect(serialized.orders).to.be.eql([])
        })

        it('serializes all of the orders', () => {
          blockOrder.orders = [ osm ]
          OrderStateMachine.serialize.returns([ osm ])

          const serialized = blockOrder.serialize()

          expect(serialized.orders).to.have.lengthOf(1)
        })
      })

      describe('fills', () => {
        let fsm

        beforeEach(() => {
          fsm = {
            fill: {
              order: {
                orderId: 'otherkey',
                baseSymbol: 'BTC',
                counterSymbol: 'XYZ',
                side: 'BID',
                baseAmount: '1000',
                counterAmount: '10000'
              },
              fillId: 'mykey',
              fillAmount: '900',
              counterFillAmount: '9000',
              makerAddress: 'bolt:1231243fasdf',
              feePaymentRequest: 'lnbcasodifjoija',
              depositPaymentRequest: 'lnbcaosdifjaosdfj'
            },
            state: 'created'
          }
        })

        it('assigns an empty array if fills is not defined', () => {
          const serialized = blockOrder.serialize()

          expect(serialized).to.have.property('fills')
          expect(serialized.fills).to.be.eql([])
        })

        it('serializes all of the fills', () => {
          blockOrder.fills = [ fsm ]
          FillStateMachine.serialize.returns([ fsm ])

          const serialized = blockOrder.serialize()

          expect(serialized.fills).to.have.lengthOf(1)
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

        expect(serialized).to.have.property('amount', params.amount + '.0000000000000000')
        expect(serialized.amount).to.be.a('string')
      })

      it('converts the price to a string', () => {
        const serialized = blockOrder.serialize()

        expect(serialized).to.have.property('limitPrice', '100.0000000000000000')
      })

      it('provides null if the price is not present', () => {
        params.price = undefined
        blockOrder = new BlockOrder(params)
        const serialized = blockOrder.serialize()

        return expect(serialized.limitPrice).to.be.null
      })

      it('returns a market price if the price is not present', () => {
        params.price = undefined

        blockOrder = new BlockOrder(params)
        const serialized = blockOrder.serialize()

        expect(serialized.isMarketOrder).to.be.eql(true)
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

    describe('get datetime', () => {
      it('defines a datetime', () => {
        expect(blockOrder).to.have.property('datetime')
        expect(nanoToDatetimeStub).to.have.been.calledWith(timestamp)
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
      it('defines a baseAmount in base units', () => {
        expect(blockOrder).to.have.property('baseAmount', '1000000000000')
      })
    })

    describe('get counterAmount', () => {
      it('calculates the counterAmount', () => {
        expect(blockOrder).to.have.property('counterAmount', '100000000000000')
      })

      it('returns undefined if no price is defined', () => {
        params.price = undefined
        blockOrder = new BlockOrder(params)

        expect(blockOrder).to.have.property('counterAmount', undefined)
      })
    })

    describe('get outboundAmount', () => {
      it('gets outboundAmount correctly if order is a bid', () => {
        expect(blockOrder).to.have.property('outboundAmount', '100000000000000')
      })

      it('gets outboundAmount correctly if order is an ask', () => {
        blockOrder.side = 'ASK'
        expect(blockOrder).to.have.property('outboundAmount', '1000000000000')
      })
    })

    describe('get inboundAmount', () => {
      it('gets inboundAmount correctly if order is a bid', () => {
        expect(blockOrder).to.have.property('inboundAmount', '1000000000000')
      })

      it('gets inboundAmount correctly if order is an ask', () => {
        blockOrder.side = 'ASK'
        expect(blockOrder).to.have.property('inboundAmount', '100000000000000')
      })
    })

    describe('get inboundSymbol', () => {
      it('gets inboundSymbol correctly if order is a bid', () => {
        expect(blockOrder).to.have.property('inboundSymbol', 'BTC')
      })

      it('gets inboundSymbol correctly if order is an ask', () => {
        blockOrder.side = 'ASK'
        expect(blockOrder).to.have.property('inboundSymbol', 'LTC')
      })
    })

    describe('get outboundSymbol', () => {
      it('gets outboundSymbol correctly if order is a bid', () => {
        expect(blockOrder).to.have.property('outboundSymbol', 'LTC')
      })

      it('gets outboundSymbol correctly if order is an ask', () => {
        blockOrder.side = 'ASK'
        expect(blockOrder).to.have.property('outboundSymbol', 'BTC')
      })
    })

    describe('get isActive', () => {
      it('returns true if blockOrder is active', () => {
        expect(blockOrder).to.have.property('isActive', true)
      })

      it('returns false if order is not active', () => {
        blockOrder.status = 'CANCELLED'
        expect(blockOrder).to.have.property('isActive', false)
      })
    })

    describe('get isInWorkableState', () => {
      it('returns true if blockOrder is active', () => {
        expect(blockOrder).to.have.property('isInWorkableState', true)
      })

      it('returns false if order is not active', () => {
        blockOrder.status = 'CANCELLED'
        expect(blockOrder).to.have.property('isInWorkableState', false)
      })
    })
    describe('get isMarketOrder', () => {
      it('gets true if block order is a market order', () => {
        blockOrder.price = null
        expect(blockOrder).to.have.property('isMarketOrder', true)
      })

      it('gets false if block order is not a market order', () => {
        expect(blockOrder).to.have.property('isMarketOrder', false)
      })
    })

    describe('get activeFills', () => {
      let fills
      let createdFill
      let filledFill
      let noneFill

      beforeEach(() => {
        createdFill = { state: 'created' }
        filledFill = { state: 'filled' }
        noneFill = { state: 'none' }

        fills = [createdFill, filledFill, noneFill]
      })

      it('returns fills only in created or filled states', () => {
        blockOrder.fills = fills
        expect(blockOrder.activeFills).to.eql([createdFill, filledFill])
      })
    })

    describe('get orders in certain state', () => {
      let orders
      let createdOrder
      let placedOrder
      let noneOrder
      let executingOrder
      let cancelledOrder

      beforeEach(() => {
        createdOrder = { state: 'created' }
        placedOrder = { state: 'placed' }
        noneOrder = { state: 'none' }
        executingOrder = { state: 'executing' }
        cancelledOrder = { state: 'cancelled' }

        orders = [createdOrder, placedOrder, noneOrder, executingOrder, cancelledOrder]
      })

      it('activeOrders returns orders in created, placed, executing states', () => {
        blockOrder.orders = orders
        expect(blockOrder.activeOrders).to.eql([createdOrder, placedOrder, executingOrder])
      })

      it('openOrders returns orders in created, placed states', () => {
        blockOrder.orders = orders
        expect(blockOrder.openOrders).to.eql([createdOrder, placedOrder])
      })
    })

    describe('activeOutboundAmount', () => {
      let orders
      let fills
      let createdOrder
      let placedOrder
      let executingOrder
      let createdFill
      let filledFill

      beforeEach(() => {
        createdOrder = { order: { outboundAmount: '5000' }, state: 'created' }
        placedOrder = { order: { outboundAmount: '1000' }, state: 'placed' }
        executingOrder = { order: { outboundFillAmount: '2000' }, state: 'executing' }
        createdFill = { fill: { outboundAmount: '3000' }, state: 'created' }
        filledFill = { fill: { outboundAmount: '6000' }, state: 'filled' }
        orders = [createdOrder, placedOrder, executingOrder]
        fills = [createdFill, filledFill]
      })

      it('adds order.outboundFillAmount if the order is in an executing state', () => {
        orders = [executingOrder]
        blockOrder.orders = orders
        const outboundAmount = blockOrder.activeOutboundAmount()
        expect(outboundAmount).to.eql(Big('2000'))
      })

      it('adds order.outboundAmount if the order is not in an executing state', () => {
        orders = [createdOrder, placedOrder]
        blockOrder.orders = orders
        blockOrder.activeOutboundAmount()
        const outboundAmount = blockOrder.activeOutboundAmount()
        expect(outboundAmount).to.eql(Big('6000'))
      })

      it('adds all outbound order amounts', () => {
        orders = [createdOrder, placedOrder, executingOrder]
        blockOrder.orders = orders
        blockOrder.fills = []
        const outboundAmount = blockOrder.activeOutboundAmount()
        expect(outboundAmount).to.eql(Big('8000'))
      })

      it('adds all outbound fills amounts', () => {
        blockOrder.orders = []
        blockOrder.fills = fills
        const outboundAmount = blockOrder.activeOutboundAmount()
        expect(outboundAmount).to.eql(Big('9000'))
      })

      it('returns sum of outbound order amounts and outbound fill amounts', () => {
        blockOrder.orders = orders
        blockOrder.fills = fills
        const outboundAmount = blockOrder.activeOutboundAmount()
        expect(outboundAmount).to.eql(Big('17000'))
      })
    })

    describe('activeInboundAmount', () => {
      let orders
      let fills
      let createdOrder
      let placedOrder
      let executingOrder
      let createdFill
      let filledFill

      beforeEach(() => {
        createdOrder = { order: { inboundAmount: '5000' }, state: 'created' }
        placedOrder = { order: { inboundAmount: '1000' }, state: 'placed' }
        executingOrder = { order: { inboundFillAmount: '2000' }, state: 'executing' }
        createdFill = { fill: { inboundAmount: '3000' }, state: 'created' }
        filledFill = { fill: { inboundAmount: '6000' }, state: 'filled' }
        orders = [createdOrder, placedOrder, executingOrder]
        fills = [createdFill, filledFill]
      })

      it('adds order.inboundFillAmount if the order is in an executing state', () => {
        orders = [executingOrder]
        blockOrder.orders = orders
        const inboundAmount = blockOrder.activeInboundAmount()
        expect(inboundAmount).to.eql(Big('2000'))
      })

      it('adds order.inboundAmount if the order is not in an executing state', () => {
        orders = [createdOrder, placedOrder]
        blockOrder.orders = orders
        blockOrder.activeInboundAmount()
        const inboundAmount = blockOrder.activeInboundAmount()
        expect(inboundAmount).to.eql(Big('6000'))
      })

      it('adds all inbound order amounts', () => {
        orders = [createdOrder, placedOrder, executingOrder]
        blockOrder.orders = orders
        blockOrder.fills = []
        const inboundAmount = blockOrder.activeInboundAmount()
        expect(inboundAmount).to.eql(Big('8000'))
      })

      it('adds all inbound fills amounts', () => {
        blockOrder.orders = []
        blockOrder.fills = fills
        const inboundAmount = blockOrder.activeInboundAmount()
        expect(inboundAmount).to.eql(Big('9000'))
      })

      it('returns sum of inbound order amounts and inbound fill amounts', () => {
        blockOrder.orders = orders
        blockOrder.fills = fills
        const inboundAmount = blockOrder.activeInboundAmount()
        expect(inboundAmount).to.eql(Big('17000'))
      })
    })

    describe('get quantumPrice', () => {
      it('calculates the quantumPrice', () => {
        expect(blockOrder).to.have.property('quantumPrice', '100.0000000000000000')
      })
    })

    describe('get isBid', () => {
      it('returns true if blockOrder is a bid', () => {
        expect(blockOrder).to.have.property('isBid', true)
      })

      it('returns false if blockOrder is not a bid', () => {
        blockOrder.side = 'ASK'
        expect(blockOrder).to.have.property('isBid', false)
      })
    })

    describe('get isAsk', () => {
      it('returns true if blockOrder is an ask', () => {
        blockOrder.side = 'ASK'
        expect(blockOrder).to.have.property('isAsk', true)
      })

      it('returns false if blockOrder is not an ask', () => {
        expect(blockOrder).to.have.property('isAsk', false)
      })
    })

    describe('populateOrders', () => {
      let ordersStore
      let getRecords
      let orders = [
        {
          id: 'someId'
        }
      ]

      beforeEach(() => {
        ordersStore = {
          put: sinon.stub()
        }
        getRecords = sinon.stub().resolves(orders)

        getRecords.withArgs(ordersStore).resolves(orders)

        BlockOrder.__set__('getRecords', getRecords)
      })

      it('retrieves all open orders associated with the block order', async () => {
        const fakeRange = 'myrange'
        Order.rangeForBlockOrder.returns(fakeRange)

        await blockOrder.populateOrders(ordersStore)

        expect(Order.rangeForBlockOrder).to.have.been.calledOnce()
        expect(Order.rangeForBlockOrder).to.have.been.calledWith(blockOrder.id)
        expect(getRecords).to.have.been.calledOnce()
        expect(getRecords).to.have.been.calledWith(ordersStore, sinon.match.func, fakeRange)
        expect(blockOrder).to.have.property('orders', orders)
      })

      it('inflates orders', async () => {
        const fakeKey = 'mykey'
        const fakeOrder = 'someorder'
        const fakeState = 'somestate'
        const fakeValue = JSON.stringify({
          order: fakeOrder,
          state: fakeState
        })
        const inflatedOrder = 'lol'
        Order.fromObject.returns(inflatedOrder)

        await blockOrder.populateOrders(ordersStore)

        const eachOrder = getRecords.withArgs(ordersStore).args[0][1]

        const inflated = eachOrder(fakeKey, fakeValue)
        expect(Order.fromObject).to.have.been.calledOnce()
        expect(Order.fromObject).to.have.been.calledWith(fakeKey, fakeOrder)
        expect(inflated).to.have.property('order', inflatedOrder)
        expect(inflated).to.have.property('state', fakeState)
      })
    })

    describe('populateFills', () => {
      let fillsStore
      let getRecords
      let fills = [
        {
          id: 'someId'
        }
      ]

      beforeEach(() => {
        fillsStore = {
          put: sinon.stub()
        }
        getRecords = sinon.stub().resolves(fills)

        getRecords.withArgs(fillsStore).resolves(fills)

        BlockOrder.__set__('getRecords', getRecords)
      })

      it('retrieves all fills associated with a block order', async () => {
        const fakeRange = 'myrange'
        Fill.rangeForBlockOrder.returns(fakeRange)

        await blockOrder.populateFills(fillsStore)

        expect(Fill.rangeForBlockOrder).to.have.been.calledOnce()
        expect(Fill.rangeForBlockOrder).to.have.been.calledWith(blockOrder.id)
        expect(getRecords).to.have.been.calledOnce()
        expect(getRecords).to.have.been.calledWith(fillsStore, sinon.match.func, fakeRange)
        expect(blockOrder).to.have.property('fills', fills)
      })

      it('inflates fills', async () => {
        const fakeKey = 'mykey'
        const fakeFill = 'someorder'
        const fakeState = 'somestate'
        const fakeValue = JSON.stringify({
          fill: fakeFill,
          state: fakeState
        })
        const inflatedFill = 'lol'
        Fill.fromObject.returns(inflatedFill)

        await blockOrder.populateFills(fillsStore)

        const eachFill = getRecords.withArgs(fillsStore).args[0][1]

        const inflated = eachFill(fakeKey, fakeValue)
        expect(Fill.fromObject).to.have.been.calledOnce()
        expect(Fill.fromObject).to.have.been.calledWith(fakeKey, fakeFill)
        expect(inflated).to.have.property('fill', inflatedFill)
        expect(inflated).to.have.property('state', fakeState)
      })
    })
  })
})
