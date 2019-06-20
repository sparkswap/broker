const { sinon, expect } = require('test/test-helper')

const migrateStore = require('./migrate-store')

describe('migrateStore', () => {
  let sourceStore
  let targetStore
  let createDbOperation
  let stream
  let fakeRecords
  let fakeOperations

  beforeEach(() => {
    stream = {
      on: sinon.stub()
    }
    sourceStore = {
      createReadStream: sinon.stub().returns(stream)
    }
    targetStore = {
      batch: sinon.stub().callsArgAsync(1)
    }
    fakeRecords = [
      { key: '1', value: 'some value' },
      { key: '2', value: 'another value' },
      { key: '3', value: '3rd value' }
    ]
    fakeOperations = [
      { type: 'put', key: 'a', value: '1' },
      { type: 'put', key: 'b', value: '2' },
      { type: 'put', key: 'c', value: '3' }
    ]

    stream.on.callsFake((evt, fn) => {
      if (evt === 'error') return
      const data = evt === 'data' ? fn : function () {}
      const end = evt === 'end' ? fn : function () {}
      const records = fakeRecords.slice()

      const nextRecord = () => {
        if (records.length) {
          data(records.shift())
          process.nextTick(nextRecord)
        } else {
          end()
        }
      }

      process.nextTick(nextRecord)
    })
    createDbOperation = sinon.stub()
    fakeRecords.forEach(({ key, value }, i) => {
      createDbOperation.withArgs(key, value).returns(fakeOperations[i])
    })
  })

  it('returns a promise', () => {
    expect(migrateStore(sourceStore, targetStore, createDbOperation)).to.be.a('promise')
  })

  it('creates a readstream from the store', () => {
    migrateStore(sourceStore, targetStore, createDbOperation)

    expect(sourceStore.createReadStream).to.have.been.calledOnce()
  })

  it('sets an error handler', () => {
    migrateStore(sourceStore, targetStore, createDbOperation)

    expect(stream.on).to.have.been.calledWith('error', sinon.match.func)
  })

  it('sets an end handler', () => {
    migrateStore(sourceStore, targetStore, createDbOperation)

    expect(stream.on).to.have.been.calledWith('end', sinon.match.func)
  })

  it('sets an data handler', () => {
    migrateStore(sourceStore, targetStore, createDbOperation)

    expect(stream.on).to.have.been.calledWith('data', sinon.match.func)
  })

  it('rejects on stream error', async () => {
    stream.on.withArgs('error').callsArgWithAsync(1, new Error('fake error'))
    return expect(migrateStore(sourceStore, targetStore, createDbOperation)).to.eventually.be.rejectedWith(Error)
  })

  it('rejects on batch error', async () => {
    targetStore.batch.callsArgWithAsync(1, new Error('fake error'))
    return expect(migrateStore(sourceStore, targetStore, createDbOperation)).to.eventually.be.rejectedWith(Error)
  })

  it('sends batches to the target store', async () => {
    await migrateStore(sourceStore, targetStore, createDbOperation)

    expect(targetStore.batch).to.have.been.calledOnce()
    expect(targetStore.batch).to.have.been.calledWith(sinon.match.array.deepEquals(fakeOperations))
  })

  it('flushes the batches on end', async () => {
    await migrateStore(sourceStore, targetStore, createDbOperation)

    expect(targetStore.batch).to.have.been.calledOnce()
    expect(targetStore.batch).to.have.been.calledWith(sinon.match.array.deepEquals(fakeOperations))
  })

  it('skips empty db operations', async () => {
    fakeOperations.push(undefined)

    await migrateStore(sourceStore, targetStore, createDbOperation)

    expect(targetStore.batch).to.have.been.calledWith(sinon.match.array.deepEquals(fakeOperations.slice(0, fakeOperations.length - 1)))
  })
})
