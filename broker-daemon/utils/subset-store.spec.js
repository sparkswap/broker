const path = require('path')
const { expect, sinon, rewire } = require('test/test-helper')

const SubsetStore = rewire(path.resolve(__dirname, 'subset-store'))

describe('SubsetStore', () => {
  let targetStore
  let sourceStore
  let migrateStore
  let logger

  beforeEach(() => {
    targetStore = { fake: 'store' }
    sourceStore = {
      pre: sinon.stub()
    }

    migrateStore = sinon.stub().resolves()
    logger = {
      debug: sinon.stub(),
      warn: sinon.stub()
    }
    SubsetStore.__set__('migrateStore', migrateStore)
    SubsetStore.__set__('logger', logger)
  })

  describe('constructor', () => {
    let subset

    beforeEach(() => {
      subset = new SubsetStore(targetStore, sourceStore)
    })

    it('assigns the target store', () => {
      expect(subset.store).to.be.equal(targetStore)
    })

    it('assigns the source store', () => {
      expect(subset.sourceStore).to.be.equal(sourceStore)
    })
  })

  describe('ensureIndex', () => {
    let subset

    beforeEach(async () => {
      subset = new SubsetStore(targetStore, sourceStore)
      subset.clearIndex = sinon.stub().resolves()
      subset.rebuildIndex = sinon.stub().resolves()
      subset.addIndexHook = sinon.stub()

      await subset.ensureIndex()
    })

    it('clears the index', () => {
      expect(subset.clearIndex).to.have.been.calledOnce()
    })

    it('rebuilds the index', () => {
      expect(subset.rebuildIndex).to.have.been.calledOnce()
    })

    it('adds a hook for new events', () => {
      expect(subset.addIndexHook).to.have.been.calledOnce()
    })
  })

  describe('addToIndexOperation', () => {
    let key
    let value
    let subset
    let expectedAddOp

    beforeEach(() => {
      key = 'mykey'
      value = 'myvalue'

      expectedAddOp = {
        key,
        value,
        type: 'put',
        prefix: targetStore
      }

      subset = new SubsetStore(targetStore, sourceStore)
    })

    it('adds the record to the target store', () => {
      expect(subset.addToIndexOperation(key, value)).to.be.eql(expectedAddOp)
    })
  })

  describe('clearIndex', () => {
    let subset

    beforeEach(() => {
      subset = new SubsetStore(targetStore, sourceStore)
      subset.removeHook = sinon.stub()
    })

    it('removes any previous hooks', async () => {
      await subset.clearIndex()

      expect(subset.removeHook).to.have.been.calledOnce()
    })

    it('deletes the store through a self migration', async () => {
      await subset.clearIndex()

      expect(migrateStore).to.have.been.calledOnce()
      expect(migrateStore).to.have.been.calledWith(targetStore, targetStore)
    })

    it('deletes every key in the store', async () => {
      await subset.clearIndex()

      const migrator = migrateStore.args[0][2]

      expect(migrator).to.be.a('function')
      expect(migrator('mykey')).to.be.eql({ type: 'del', key: 'mykey' })
    })
  })

  describe('rebuildIndex', () => {
    let subset

    beforeEach(() => {
      subset = new SubsetStore(targetStore, sourceStore)
    })

    it('rebuilds the store from the source', async () => {
      const fakeBound = 'fakefunc'
      subset.addToIndexOperation.bind = sinon.stub().returns(fakeBound)

      await subset.rebuildIndex()

      expect(migrateStore).to.have.been.calledOnce()
      expect(migrateStore).to.have.been.calledWith(sourceStore, targetStore, fakeBound)
    })
  })

  describe('addIndexHook', () => {
    let subset
    let preHook
    let add

    beforeEach(() => {
      subset = new SubsetStore(targetStore, sourceStore)
      subset.addIndexHook()
      preHook = sourceStore.pre.args[0] ? sourceStore.pre.args[0][0] : undefined
      add = sinon.stub()
    })

    it('monitors the event store', () => {
      expect(sourceStore.pre).to.have.been.calledOnce()
      expect(sourceStore.pre).to.have.been.calledWithMatch(sinon.match.func)
    })

    it('deletes from the target store when deletes happen on the source store', () => {
      const eventKey = 'yourkey'

      preHook(
        {
          type: 'del',
          key: eventKey
        },
        add
      )

      expect(add).to.have.been.calledOnce()
      expect(add).to.have.been.calledWith({
        type: 'del',
        key: eventKey,
        prefix: targetStore
      })
    })

    it('adds the index op when put operations happen on the source store', () => {
      const eventKey = 'yourkey'
      const eventValue = 'myvalue'
      const fakeOp = 'myop'

      subset.addToIndexOperation = sinon.stub().returns(fakeOp)

      preHook(
        {
          type: 'put',
          key: eventKey,
          value: eventValue
        },
        add
      )

      expect(add).to.have.been.calledOnce()
      expect(subset.addToIndexOperation).to.have.been.calledOnce()
      expect(subset.addToIndexOperation).to.have.been.calledWith(eventKey, eventValue)
      expect(add).to.have.been.calledWith(fakeOp)
    })
  })
})
