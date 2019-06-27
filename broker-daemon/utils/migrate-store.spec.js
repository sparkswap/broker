const path = require('path')
const {
  sinon,
  expect,
  rewire
} = require('test/test-helper')

const migrateStore = rewire(path.resolve(__dirname, './migrate-store'))

describe.only('migrateStore', () => {
  let sourceStore
  let targetStore
  let createDbOperation
  let batchSize
  let onStub
  let pauseStub
  let resumeStub

  beforeEach(() => {
    onStub = sinon.stub()
    pauseStub = sinon.stub()
    resumeStub = sinon.stub()
    sourceStore = {
      createReadStream: sinon.stub().returns({
        on: onStub,
        pause: pauseStub,
        resume: resumeStub
      })
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
      const error = onStub.args[2][1]
      error()
      return expect(promise).to.eventually.be.rejected()
    })
  })

  context('on end', () => {
    let promisifyStub
    let batchStub
    let reverts

    beforeEach(() => {
      batchStub = sinon.stub()
      promisifyStub = sinon.stub().returns(batchStub)

      reverts = []
      reverts.push(migrateStore.__set__('promisify', promisifyStub))
    })

    it('processes a batch', async () => {
      migrateStore(sourceStore, targetStore, createDbOperation, batchSize)
      const onEnd = onStub.args[1][1]
      await onEnd()
      expect(batchStub).to.have.been.calledWith([])
    })

    it('resolves the promise', () => {
      migrateStore(sourceStore, targetStore, createDbOperation, batchSize)
      const onEnd = onStub.args[1][1]
      return expect(onEnd()).to.eventually.be.fulfilled()
    })

    it('rejects if the batch fails to resolve', async () => {
      batchStub.rejects()
      const promise = migrateStore(sourceStore, targetStore, createDbOperation, batchSize)
      const onEnd = onStub.args[1][1]
      await onEnd()
      return expect(promise).to.eventually.be.rejected()
    })
  })

  context('on data', () => {
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
      batchStub = sinon.stub()
      promisifyStub = sinon.stub().returns(batchStub)
      params = {
        key: '1',
        value: 'crypto'
      }

      reverts = []
      reverts.push(migrateStore.__set__('promisify', promisifyStub))
    })

    afterEach(() => {
      reverts.forEach(r => r())
    })

    it('runs the KV through a db operation', async () => {
      migrateStore(sourceStore, targetStore, createDbOperation, batchSize)
      const onData = onStub.args[0][1]
      await onData(params)
      expect(createDbOperation).to.have.been.calledWith(params.key, params.value)
    })

    it('returns if the db operation is null', async () => {
      createDbOperation.returns(null)
      migrateStore(sourceStore, targetStore, createDbOperation, batchSize)
      const onData = onStub.args[0][1]
      await onData(params)
      expect(batchStub).to.not.have.been.called()
    })

    it('pushes the db operation onto the batch', async () => {
      migrateStore(sourceStore, targetStore, createDbOperation, batchSize)
      const onData = onStub.args[0][1]
      createDbOperation.returns(null)
      await onData(params)
      createDbOperation.returns(records[0])
      await onData(params)
      expect(batchStub.args[0][0].length).to.be.eql(1)
    })

    it('returns if the batch size has not been hit', async () => {
      migrateStore(sourceStore, targetStore, createDbOperation, 2)
      const onData = onStub.args[0][1]
      await onData(params)
      expect(batchStub).to.not.have.been.called()
    })

    it('pauses the stream before processing a batch', async () => {
      migrateStore(sourceStore, targetStore, createDbOperation, 1)
      const onData = onStub.args[0][1]
      await onData(params)
      expect(pauseStub).to.have.been.calledBefore(batchStub)
    })

    it('resumes the stream after processing the batch', async () => {
      migrateStore(sourceStore, targetStore, createDbOperation, 1)
      const onData = onStub.args[0][1]
      await onData(params)
      expect(batchStub).to.have.been.calledBefore(resumeStub)
    })

    context('batch is full', () => {
      it('awaits the previous batch if the batch size is large', async () => {
        migrateStore(sourceStore, targetStore, createDbOperation, 5)
        const onData = onStub.args[0][1]
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
        const onData = onStub.args[0][1]
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
