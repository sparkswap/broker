const path = require('path')
const { expect, sinon, rewire } = require('test/test-helper')

const ActiveOrdersIndex = rewire(path.resolve(__dirname, 'active-orders-index'))

describe('ActiveOrdersIndex', () => {
  let baseStore
  let SubsetStore
  let OrderStateMachine
  let resets

  beforeEach(() => {
    baseStore = {
      sublevel: sinon.stub()
    }

    OrderStateMachine = {
      ACTIVE_STATES: {
        SOME: 'SOME',
        ACTIVE: 'ACTIVE',
        STATES: 'STATES'
      }
    }

    resets = []
    resets.push(ActiveOrdersIndex.__set__('OrderStateMachine', OrderStateMachine))
    SubsetStore = ActiveOrdersIndex.__get__('SubsetStore')
  })

  afterEach(() => {
    resets.forEach((reset) => reset())
  })

  describe('constructor', () => {
    let activeOrdersIndex
    let fakeStore

    beforeEach(() => {
      fakeStore = 'mystore'
      baseStore.sublevel.returns(fakeStore)
      activeOrdersIndex = new ActiveOrdersIndex(baseStore)
    })

    it('is a sub-class of SubsetStore', () => {
      expect(activeOrdersIndex).to.be.an.instanceOf(SubsetStore)
    })

    it('creates a store for the index', () => {
      expect(baseStore.sublevel).to.have.been.calledOnce()
      expect(baseStore.sublevel).to.have.been.calledWith('activeOrders')
      // normally I would check that a stub had been called instead of reaching
      // into the functionality of the dependency, but class constructors are
      // basically impossible to stub.
      expect(activeOrdersIndex.store).to.be.eql(fakeStore)
    })

    it('uses the base store as the source store', () => {
      // normally I would check that a stub had been called instead of reaching
      // into the functionality of the dependency, but class constructors are
      // basically impossible to stub.
      expect(activeOrdersIndex.sourceStore).to.be.eql(baseStore)
    })
  })

  describe('addToIndexOperation', () => {
    let orderKey
    let orderValue
    let activeOrdersIndex

    beforeEach(() => {
      orderKey = 'mykey'
      orderValue = JSON.stringify({
        state: 'ACTIVE'
      })

      activeOrdersIndex = new ActiveOrdersIndex(baseStore)
    })

    it('adds orders in active states', () => {
      expect(activeOrdersIndex.addToIndexOperation(orderKey, orderValue)).to.be.eql({
        key: orderKey,
        value: orderValue,
        type: 'put',
        prefix: activeOrdersIndex.store
      })
    })

    it('removes orders in inactive states', () => {
      orderValue = JSON.stringify({
        state: 'INACTIVE'
      })
      expect(activeOrdersIndex.addToIndexOperation(orderKey, orderValue)).to.be.eql({
        key: orderKey,
        type: 'del',
        prefix: activeOrdersIndex.store
      })
    })
  })
})
