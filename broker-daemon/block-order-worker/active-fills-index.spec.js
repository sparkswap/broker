const path = require('path')
const { expect, sinon, rewire } = require('test/test-helper')

const ActiveFillsIndex = rewire(path.resolve(__dirname, 'active-fills-index'))

describe('ActiveFillsIndex', () => {
  let baseStore
  let SubsetStore
  let FillStateMachine
  let resets

  beforeEach(() => {
    baseStore = {
      sublevel: sinon.stub()
    }

    FillStateMachine = {
      ACTIVE_STATES: {
        SOME: 'SOME',
        ACTIVE: 'ACTIVE',
        STATES: 'STATES'
      }
    }

    resets = []
    resets.push(ActiveFillsIndex.__set__('FillStateMachine', FillStateMachine))
    SubsetStore = ActiveFillsIndex.__get__('SubsetStore')
  })

  afterEach(() => {
    resets.forEach((reset) => reset())
  })

  describe('constructor', () => {
    let activeFillsIndex
    let fakeStore

    beforeEach(() => {
      fakeStore = 'mystore'
      baseStore.sublevel.returns(fakeStore)
      activeFillsIndex = new ActiveFillsIndex(baseStore)
    })

    it('is a sub-class of SubsetStore', () => {
      expect(activeFillsIndex).to.be.an.instanceOf(SubsetStore)
    })

    it('creates a store for the index', () => {
      expect(baseStore.sublevel).to.have.been.calledOnce()
      expect(baseStore.sublevel).to.have.been.calledWith('activeFills')
      // normally I would check that a stub had been called instead of reaching
      // into the functionality of the dependency, but class constructors are
      // basically impossible to stub.
      expect(activeFillsIndex.store).to.be.eql(fakeStore)
    })

    it('uses the base store as the source store', () => {
      // normally I would check that a stub had been called instead of reaching
      // into the functionality of the dependency, but class constructors are
      // basically impossible to stub.
      expect(activeFillsIndex.sourceStore).to.be.eql(baseStore)
    })
  })

  describe('addToIndexOperation', () => {
    let fillKey
    let fillValue
    let activeFillsIndex

    beforeEach(() => {
      fillKey = 'mykey'
      fillValue = JSON.stringify({
        state: 'ACTIVE'
      })

      activeFillsIndex = new ActiveFillsIndex(baseStore)
    })

    it('adds fills in active states', () => {
      expect(activeFillsIndex.addToIndexOperation(fillKey, fillValue)).to.be.eql({
        key: fillKey,
        value: fillValue,
        type: 'put',
        prefix: activeFillsIndex.store
      })
    })

    it('removes fills in inactive states', () => {
      fillValue = JSON.stringify({
        state: 'INACTIVE'
      })
      expect(activeFillsIndex.addToIndexOperation(fillKey, fillValue)).to.be.eql({
        key: fillKey,
        type: 'del',
        prefix: activeFillsIndex.store
      })
    })
  })
})
