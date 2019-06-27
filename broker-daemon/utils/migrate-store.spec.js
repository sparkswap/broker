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
  let pauseStub
  let resumeStub
  let batchStub
  let reverts
  let promisifyStub

  beforeEach(() => {
    onStub = sinon.stub()
    pauseStub = sinon.stub()
    resumeStub = sinon.stub()
    batchStub = sinon.stub()
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
    promisifyStub = sinon.stub().withArgs(targetStore.batch).returns(batchStub)

    reverts = []
    reverts.push(migrateStore.__set__('promisify', promisifyStub))
  })

  afterEach(() => {
    reverts.forEach(r => r())
  })

  it('returns a promise', () => {
    expect(migrateStore(sourceStore, targetStore, createDbOperation, batchSize)).to.be.a('promise')
  })

  it('creates a read string from the source sublevel store', async () => {
    migrateStore(sourceStore, targetStore, createDbOperation, batchSize)
    expect(sourceStore.createReadStream).to.have.been.called()
    expect(sourceStore.createReadStream).to.have.been.calledOnce()
  })

  it('migrates records to a target store', async () => {
    const record = { key: '1', value: '1234' }
    const batchEntry = { type: 'del', key: record.key }
    onStub.withArgs('data', sinon.match.any).yields(record)
    createDbOperation.withArgs(record.key, record.value).returns(batchEntry)
    batchStub.resolves()

    migrateStore(sourceStore, targetStore, createDbOperation, batchSize)

    expect(batchStub).to.have.been.calledWith([batchEntry])
    expect(pauseStub).to.have.been.calledBefore(batchStub)
    expect(batchStub).to.have.been.calledBefore(resumeStub)
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
    let params
    let records

    beforeEach(() => {
      records = [
        { key: '1234', value: '1234' }
      ]
      createDbOperation.returns(records[0])
      params = {
        key: '1',
        value: 'crypto'
      }
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
      it('processes the batch', async () => {
        migrateStore(sourceStore, targetStore, createDbOperation, 3)
        const onData = onStub.args[0][1]

        for (let i = 0; i < 2; i++) {
          await onData(params)
        }

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
