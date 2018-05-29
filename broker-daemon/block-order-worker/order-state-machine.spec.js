const path = require('path')
const { expect, rewire, sinon } = require('test/test-helper')

const OrderStateMachine = rewire(path.resolve(__dirname, 'order-state-machine'))

describe('OrderStateMachine', () => {
  let Order

  let store
  let logger
  let relayer
  let engine

  beforeEach(() => {
    Order = sinon.stub()
    OrderStateMachine.__set__('Order', Order)

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
    xit('creates a new state machine')

    xit('exposes the store')

    xit('exposes the logger')

    xit('exposes the relayer')

    xit('exposes the engine')

    xit('does not save a copy in the store')
  })

  describe('#create', () => {
    xit('creates an order model')

    xit('creates an order on the relayer')

    xit('saves a copy in the store')

    xit('cancels the transition if the creation on the relayer fails')

    xit('does not save a copy if creation on the relayer fails')
    
    xit('includes returned order id in the saved copy')

    xit('saves the current state in the store')
  })

  describe('#goto', () => {
    xit('moves the state to the given state')

    xit('does not save a copy in the store')
  })

  describe('::create', () => {
    xit('initializes a state machine')

    xit('runs a create transition on the state machine')
  })

  describe('::fromStore', () => {
    xit('initializes a state machine')

    xit('moves to the correct state')

    xit('applies all the saved data')
  })
})