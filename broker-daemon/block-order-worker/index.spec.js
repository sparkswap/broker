const path = require('path')
const { expect, rewire, sinon } = require('test/test-helper')

const BlockOrderWorker = rewire(path.resolve(__dirname))

describe('BlockOrderWorker', () => {
  let EventEmitter
  let eventsOn
  let eventsEmit
  let safeid
  let BlockOrder
  let OrderStateMachine

  let orderbooks
  let store
  let logger
  let relayer
  let engine

  beforeEach(() => {
    EventEmitter = sinon.stub()
    eventsOn = sinon.stub()
    eventsEmit = sinon.stub()
    EventEmitter.prototype.on = eventsOn
    EventEmitter.prototype.emit = eventsEmit
    BlockOrderWorker.__set__('EventEmitter', EventEmitter)

    safeid = sinon.stub()
    BlockOrderWorker.__set__('safeid', safeid)

    BlockOrder = sinon.stub()
    BlockOrderWorker.__set__('BlockOrder', BlockOrder)

    OrderStateMachine = sinon.stub()
    BlockOrderWorker.__set__('OrderStateMachine', OrderStateMachine)

    orderbooks = new Map([['BTC/LTC', sinon.stub()]])
    store = {
      sublevel: sinon.stub(),
      put: sinon.stub()
    }
    logger = {
      info: sinon.stub(),
      error: sinon.stub(),
      debug: sinon.stub()
    }
    relayer = sinon.stub()
    engine = sinon.stub()
  })

  describe('new', () => {
    xit('creates a new instance')

    xit('works a block order when one is created')
  })

  describe('createBlockOrder', () => {
    xit('throws if the market is not supported')

    xit('creates an id')

    xit('saves a block order in the store')

    xit('emits an event to trigger working')
  })

  describe('workBlockOrder', () => {
    xit('errors if the market is not supported')

    xit('creates an OrderStateMachine')

    xit('provides a sublevel of the block order for the OrderStateMachine')

    xit('provies the relayer to the OrderStateMachine')

    xit('provies the engine to the OrderStateMachine')

    // NOTE: other testing is TODO until workBlockOrder supports more sophisticated order handling
  })
})