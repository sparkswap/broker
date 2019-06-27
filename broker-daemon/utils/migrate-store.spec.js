const path = require('path')
const {
  sinon,
  expect,
  rewire
} = require('test/test-helper')

const migrateStore = rewire(path.resolve(__dirname, './migrate-store'))

describe('migrateStore', () => {
  let sourceStore
  let targetStore
  let createDbOperation
  let batchSize
  let onStub

  beforeEach(() => {
    onStub = sinon.stub()
    sourceStore = {
      createReadStream: sinon.stub().returns({ on: onStub })
    }
    targetStore = {
      batch: sinon.stub()
    }
    createDbOperation = sinon.stub()
    batchSize = 1
  })

  it('returns a promise', () => {
    expect(migrateStore(sourceStore, targetStore, createDbOperation, batchSize)).to.be.a('promise')
  })

  it('creates a read string from the source sublevel store', async () => {
    migrateStore(sourceStore, targetStore, createDbOperation, batchSize)
    expect(sourceStore.createReadStream).to.have.been.called()
    expect(sourceStore.createReadStream).to.have.been.calledOnce()
  })

  context('on error', () => {
    it('rejects the promise if there was a failure', () => {
      const promise = migrateStore(sourceStore, targetStore, createDbOperation, batchSize)
      const error = onStub.args[0][1]
      error()
      return expect(promise).to.eventually.be.rejected()
    })
  })

  context.only('on end', () => {
    let previousBatchStub
    let flushStub
    let reverts

    beforeEach(() => {
      previousBatchStub = sinon.stub().resolves()
      flushStub = sinon.stub().returns('lol')

      reverts = []
      reverts.push(migrateStore.__set__('previousBatch', previousBatchStub))
    })

    afterEach(() => {
      reverts.forEach(r => r())
    })

    it.only('runs the previous batches', () => {
      migrateStore(sourceStore, targetStore, createDbOperation, batchSize)
      reverts.push(migrateStore.__set__('flush', flushStub))
      const end = onStub.args[1][1]
      end()
      return expect(previousBatchStub).to.be.called()
    })

    it('resolves the promise', () => {
      const promise = migrateStore(sourceStore, targetStore, createDbOperation, batchSize)
      const end = onStub.args[1][1]
      end()
      return expect(promise).to.not.have.eventually.been.rejected()
    })

    it('rejects the promise if an error occurred when processing the previous batch', async () => {
      previousBatchStub.rejects()
      const promise = migrateStore(sourceStore, targetStore, createDbOperation, batchSize)
      const end = onStub.args[1][1]
      await end()
      return expect(promise).to.have.eventually.been.rejected()
    })
  })

  context('on data', () => {
    let previousBatchStub
    let reverts
    let params
    let promisifyStub
    let batchStub
    let records

    beforeEach(() => {
      records = [
        { key: '1234', value: '1234' }
      ]
      createDbOperation.returns(records[0])
      previousBatchStub = sinon.stub()
      batchStub = sinon.stub()
      promisifyStub = sinon.stub().returns(batchStub)
      params = {
        key: '1',
        value: 'crypto'
      }

      reverts = []
      reverts.push(migrateStore.__set__('previousBatch', previousBatchStub))
      reverts.push(migrateStore.__set__('promisify', promisifyStub))
    })

    afterEach(() => {
      reverts.forEach(r => r())
    })

    it('runs the KV through a db operation', async () => {
      migrateStore(sourceStore, targetStore, createDbOperation, batchSize)
      const onData = onStub.args[2][1]
      await onData(params)
      expect(createDbOperation).to.have.been.calledWith(params.key, params.value)
    })

    it('returns if the db operation is null', async () => {
      createDbOperation.returns(null)
      migrateStore(sourceStore, targetStore, createDbOperation, batchSize)
      const onData = onStub.args[2][1]
      await onData(params)
      expect(batchStub).to.not.have.been.called()
    })

    it('pushes the db operation onto the batch', async () => {
      migrateStore(sourceStore, targetStore, createDbOperation, batchSize)
      const onData = onStub.args[2][1]
      createDbOperation.returns(null)
      await onData(params)
      createDbOperation.returns(records[0])
      await onData(params)
      expect(batchStub.args[0][0].length).to.be.eql(1)
    })

    it('returns if the batch size has not been hit', async () => {
      migrateStore(sourceStore, targetStore, createDbOperation, 2)
      const onData = onStub.args[2][1]
      await onData(params)
      expect(batchStub).to.not.have.been.called()
    })

    context('batch is full', () => {
      it('awaits the previous batch if the batch size is large', async () => {
        migrateStore(sourceStore, targetStore, createDbOperation, 5)
        const onData = onStub.args[2][1]
        await onData(params)
        expect(batchStub).to.not.have.been.called()
        await onData(params)
        expect(batchStub).to.not.have.been.called()
        await onData(params)
        expect(batchStub).to.not.have.been.called()
        await onData(params)
        expect(batchStub).to.not.have.been.called()
        await onData(params)
        expect(batchStub).to.have.been.called()
      })

      it('clears the batch', async () => {
        migrateStore(sourceStore, targetStore, createDbOperation, 3)
        const onData = onStub.args[2][1]
        await onData(params)
        await onData(params)
        await onData(params)
        expect(batchStub.args[0][0].length).to.eql(3)
        await onData(params)
        expect(batchStub).to.have.been.calledOnce()
      })
    })
  })
})
