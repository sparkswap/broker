const path = require('path')
const { sinon, expect, rewire, delay } = require('test/test-helper')

const Index = rewire(path.resolve(__dirname, 'sublevel-index'))

describe('Index', () => {
  let through
  let migrateStore
  let logger
  let store
  let indexStore
  let indexStoreStream
  let name
  let getValue
  let filter
  let index

  beforeEach(() => {
    through = {
      obj: sinon.stub()
    }
    Index.__set__('through', through)

    migrateStore = sinon.stub()
    Index.__set__('migrateStore', migrateStore)

    logger = {
      error: sinon.stub()
    }
    Index.__set__('logger', logger)

    indexStoreStream = {
      pipe: sinon.stub()
    }
    indexStore = {
      createReadStream: sinon.stub().returns(indexStoreStream),
      del: sinon.stub()
    }

    store = {
      sublevel: sinon.stub().returns(indexStore),
      get: sinon.stub(),
      pre: sinon.stub()
    }
    name = 'fakeIndex'
    getValue = sinon.stub()
    filter = sinon.stub().returns(true)

    index = new Index(store, name, getValue, filter)
  })

  it('creates a sublevel for the index', () => {
    expect(index).to.have.property('_index', indexStore)
  })

  describe('Public API', () => {
    describe('#ensureIndex', () => {
      it('clears the old index', async () => {
        index._clearIndex = sinon.stub()

        await index.ensureIndex()

        expect(index._clearIndex).to.have.been.calledOnce()
      })

      it('rebuilds the index', async () => {
        index._rebuildIndex = sinon.stub()

        await index.ensureIndex()

        expect(index._rebuildIndex).to.have.been.calledOnce()
      })

      it('adds the hook for new items', async () => {
        index._addIndexHook = sinon.stub()

        await index.ensureIndex()

        expect(index._addIndexHook).to.have.been.calledOnce()
      })

      it('returns the index', async () => {
        expect(await index.ensureIndex()).to.be.equal(index)
      })
    })

    describe('#range', () => {
      beforeEach(async () => {
        await index.ensureIndex()
      })

      const tests = {
        'gt range': {
          in: {
            gt: '1000'
          },
          out: {
            gt: '1000:' + '\x00'
          }
        },
        'gte range': {
          in: {
            gte: 'abcde'
          },
          out: {
            gte: 'abcde:' + '\x00'
          }
        },
        'lt range': {
          in: {
            lt: '1000'
          },
          out: {
            lt: '1000:' + '\uffff'
          }
        },
        'lte range': {
          in: {
            lte: '1000'
          },
          out: {
            lte: '1000:' + '\uffff'
          }
        },
        'gt lt range': {
          in: {
            gt: '1000',
            lt: '10000'
          },
          out: {
            gt: '1000:' + '\x00',
            lt: '10000:' + '\uffff'
          }
        },
        'gt lte range': {
          in: {
            gt: '1000',
            lte: '10000'
          },
          out: {
            gt: '1000:' + '\x00',
            lte: '10000:' + '\uffff'
          }
        },
        'gte lt range': {
          in: {
            gte: '1000',
            lt: '10000'
          },
          out: {
            gte: '1000:' + '\x00',
            lt: '10000:' + '\uffff'
          }
        },
        'gte lte range': {
          in: {
            gte: '1000',
            lte: '10000'
          },
          out: {
            gte: '1000:' + '\x00',
            lte: '10000:' + '\uffff'
          }
        }
      }

      for (var testName in tests) {
        let test = tests[testName]
        it(`creates a ${testName}`, () => {
          expect(index.range(test.in)).to.be.eql(test.out)
        })
      }
    })

    describe('#createReadStream', () => {
      beforeEach(async () => {
        await index.ensureIndex()
      })

      it('creates a read stream from the index', () => {
        index.createReadStream()

        expect(indexStore.createReadStream).to.have.been.calledOnce()
      })

      it('passes read stream options to the underlying store', () => {
        const opts = { fake: 'opts' }
        index.createReadStream(opts)

        expect(indexStore.createReadStream).to.have.been.calledWith(opts)
      })

      it('updates read stream range options before passing them to the underlying store', () => {
        const options = { fake: 'opts', lte: '0.000001' }
        const expectedOptions = { fake: 'opts', lte: '0.000001:\uffff' }

        index.createReadStream(options)

        expect(indexStore.createReadStream).to.have.been.calledWith(expectedOptions)
      })

      it('returns the piped stream', () => {
        const piped = 'fake pipe'
        indexStoreStream.pipe.returns(piped)

        expect(index.createReadStream()).to.be.equal(piped)
      })

      it('pipes the stream to filter deleted keys', (done) => {
        index._isMarkedForDeletion = sinon.stub().returns(true)
        index.createReadStream()
        const filter = through.obj.args[0][0]
        const throughCtx = {
          push: sinon.stub()
        }

        filter.call(throughCtx, { key: 'fakeKey', value: 'fakeValue' }, 'utf8', function () {
          expect(throughCtx.push).to.not.have.been.calledOnce()
          done()
        })
      })

      it('pipes the stream to transform to base keys', (done) => {
        const baseKey = 'fakeKey'
        index._isMarkedForDeletion = sinon.stub().returns(false)
        index._extractBaseKey = sinon.stub().returns(baseKey)
        index.createReadStream()
        const transform = through.obj.args[0][0]
        const throughCtx = {
          push: sinon.stub()
        }

        transform.call(throughCtx, { key: 'fakeKey', value: 'fakeValue' }, 'utf8', function () {
          expect(throughCtx.push).have.been.calledOnce()
          expect(throughCtx.push).to.have.been.calledWith(sinon.match({ key: baseKey, value: 'fakeValue' }))
          done()
        })
      })
    })
  })

  describe('Private API', () => {
    describe('#_extractBaseKey', () => {
      it('extracts the base key from an index key', () => {
        const baseKey = 'hello'
        const indexValue = 'world'

        expect(index._extractBaseKey(`${indexValue}:${baseKey}`)).to.be.eql(baseKey)
      })

      it('extracts base keys that contain the delimiter', () => {
        const baseKey = 'hello:world'
        const indexValue = 'world'

        expect(index._extractBaseKey(`${indexValue}:${baseKey}`)).to.be.eql(baseKey)
      })
    })

    describe('#_createIndexKey', () => {
      it('gets the index value from getValue and prepends it', () => {
        const baseKey = 'hello'
        const baseValue = '{"there": "world"}'
        const indexValue = 'world'

        getValue.returns(indexValue)

        const indexKey = index._createIndexKey(baseKey, baseValue)

        expect(getValue).to.have.been.calledOnce()
        expect(getValue).to.have.been.calledWith(baseKey, baseValue)
        expect(indexKey).to.be.eql(`${indexValue}:${baseKey}`)
      })

      it('throws if the index value contains the delimiter', () => {
        const baseKey = 'hello'
        const baseValue = '{"there": "world"}'
        const indexValue = 'world:there'

        getValue.returns(indexValue)

        expect(() => index._createIndexKey(baseKey, baseValue)).to.throw()
      })

      it('constructs index keys in which the base key contains the delimiter', () => {
        const baseKey = 'hello:world'
        const baseValue = '{"there": "world"}'
        const indexValue = 'world'

        getValue.returns(indexValue)

        const indexKey = index._createIndexKey(baseKey, baseValue)

        expect(indexKey).to.be.eql(`${indexValue}:${baseKey}`)
      })
    })

    describe('#_startDeletion', () => {
      it('marks the key as started for deletion', () => {
        const baseKey = 'hello'

        index._startDeletion(baseKey)

        expect(index._deleted[baseKey]).to.be.equal(true)
      })
    })

    describe('#_finishDeletion', () => {
      it('marks the key as deleted', () => {
        const baseKey = 'hello'

        index._deleted[baseKey] = true
        index._finishDeletion(baseKey)

        expect(index._deleted[baseKey]).to.not.be.equal(true)
      })
    })

    describe('#_isMarkedForDeletion', () => {
      it('determines if the key is marked for deletion', () => {
        const baseKey = 'hello'
        const indexKey = `world:${baseKey}`

        index._deleted[baseKey] = true

        expect(index._isMarkedForDeletion(indexKey)).to.be.equal(true)
      })
    })

    describe('#_removeFromIndex', () => {
      let baseKey

      beforeEach(() => {
        baseKey = 'hello'
      })

      it('marks as deleting', () => {
        index._startDeletion = sinon.stub()

        index._removeFromIndex(baseKey)

        expect(index._startDeletion).to.have.been.calledOnce()
        expect(index._startDeletion).to.have.been.calledWith(baseKey)
      })

      it('gets the base object from the original store', () => {
        index._removeFromIndex(baseKey)

        expect(store.get).to.have.been.calledOnce()
        expect(store.get).to.have.been.calledWith(baseKey, sinon.match.func)
      })

      it('does not delete items that are filtered out', () => {
        filter.returns(false)

        index._removeFromIndex(baseKey)

        return expect(indexStore.del).to.not.have.been.called
      })

      it('gets the index key for the object', async () => {
        const fakeValue = 'myvalue'
        index._createIndexKey = sinon.stub()
        store.get.callsArgWithAsync(1, null, fakeValue)

        index._removeFromIndex(baseKey)

        await delay(10)

        expect(index._createIndexKey).to.have.been.calledOnce()
        expect(index._createIndexKey).to.have.been.calledWith(baseKey, fakeValue)
      })

      it('deletes from the index store using the index key', async () => {
        const fakeIndexKey = 'world'
        const fakeValue = 'myvalue'
        index._createIndexKey = sinon.stub().returns(fakeIndexKey)
        store.get.callsArgWithAsync(1, null, fakeValue)

        index._removeFromIndex(baseKey)

        await delay(10)

        expect(indexStore.del).to.have.been.calledOnce()
        expect(indexStore.del).to.have.been.calledWith(fakeIndexKey)
      })

      it('does not mark as deleted if deleting is not done', async () => {
        const fakeValue = 'myvalue'
        const promisify = sinon.stub().returns(sinon.stub())
        Index.__set__('promisify', promisify)
        index._finishDeletion = sinon.stub()
        store.get.callsArgWithAsync(1, null, fakeValue)

        index._removeFromIndex(baseKey)

        await delay(10)

        return expect(index._finishDeletion).to.not.have.been.called
      })

      it('marks as deleted once deleting is done', async () => {
        const fakeValue = 'myvalue'
        const promisify = sinon.stub().returns(sinon.stub().resolves())
        Index.__set__('promisify', promisify)
        index._finishDeletion = sinon.stub()
        store.get.callsArgWithAsync(1, null, fakeValue)

        index._removeFromIndex(baseKey)

        await delay(10)

        expect(index._finishDeletion).to.have.been.calledOnce()
        expect(index._finishDeletion).to.have.been.calledWith(baseKey)
      })
    })

    describe('#_addToIndexOperation', async () => {
      let baseKey
      let baseValue
      let indexKey

      beforeEach(() => {
        baseKey = 'hello'
        baseValue = '{"there":"world"}'
        indexKey = 'world:hello'
        index._createIndexKey = sinon.stub().returns(indexKey)
      })

      it('adds a put operation to the index', () => {
        const op = index._addToIndexOperation(baseKey, baseValue)

        expect(op).to.be.an('object')
        expect(op).to.have.property('key', indexKey)
        expect(op).to.have.property('type', 'put')
        expect(op).to.have.property('value', baseValue)
        expect(op).to.have.property('prefix', indexStore)
      })
    })

    describe('#_addIndexHook', async () => {
      let preHook

      beforeEach(() => {
        index._addIndexHook()
        preHook = store.pre.args[0][0]
      })

      it('adds a pre hook to the source database', () => {
        expect(store.pre).to.have.been.calledOnce()
        expect(store.pre).to.have.been.calledWith(sinon.match.func)
      })

      it('adds atomic puts when objects are put into the source', () => {
        const add = sinon.stub()
        const baseKey = 'hello'
        const baseValue = '{"there":"world"}'
        const fakeIndexOp = { type: 'put', prefix: index }
        index._addToIndexOperation = sinon.stub().returns(fakeIndexOp)
        preHook({ type: 'put', key: baseKey, value: baseValue }, add)

        expect(index._addToIndexOperation).to.have.been.calledOnce()
        expect(index._addToIndexOperation).to.have.been.calledWith(baseKey, baseValue)
        expect(add).to.have.been.calledOnce()
        expect(add).to.have.been.calledWith(fakeIndexOp)
      })

      it('does not add puts for items that are not in the filter', () => {
        filter.returns(false)
        const add = sinon.stub()
        const baseKey = 'hello'
        const baseValue = '{"there":"world"}'

        preHook({ type: 'put', key: baseKey, value: baseValue }, add)

        expect(filter).to.have.been.calledOnce(baseKey, baseValue)
        return expect(add).to.not.have.been.called
      })

      it('removes indexes when objects are deleted from the source', () => {
        index._removeFromIndex = sinon.stub()
        const baseKey = 'hello'

        preHook({ type: 'del', key: baseKey })

        expect(index._removeFromIndex).to.have.been.calledOnce()
        expect(index._removeFromIndex).to.have.been.calledWith(baseKey)
      })
    })

    describe('#_clearIndex', () => {
      it('returns the promise from migrate store', () => {
        const fakePromise = 'fake'
        migrateStore.returns(fakePromise)

        expect(index._clearIndex()).to.be.equal(fakePromise)
      })

      it('migrates to itself', () => {
        index._clearIndex()

        expect(migrateStore).to.have.been.calledOnce()
        expect(migrateStore).to.have.been.calledWith(indexStore, indexStore)
      })

      it('adds a batch delete for every record in the sublevel', () => {
        index._clearIndex()

        const createDelOp = migrateStore.args[0][2]
        const indexKey = 'world:hello'

        expect(createDelOp(indexKey)).to.be.eql({ type: 'del', key: indexKey, prefix: indexStore })
      })
    })

    describe('#_rebuildIndex', () => {
      it('returns the promise from migrate store', () => {
        const fakePromise = 'fake'
        migrateStore.returns(fakePromise)

        expect(index._rebuildIndex()).to.be.equal(fakePromise)
      })

      it('migrates to from the source to the index', () => {
        index._rebuildIndex()

        expect(migrateStore).to.have.been.calledOnce()
        expect(migrateStore).to.have.been.calledWith(store, indexStore)
      })

      it('adds atomic puts for every object in the store', () => {
        index._rebuildIndex()
        const createAddOp = migrateStore.args[0][2]

        const baseKey = 'hello'
        const baseValue = '{"there":"world"}'
        const fakeIndexOp = { type: 'put', prefix: index }
        index._addToIndexOperation = sinon.stub().returns(fakeIndexOp)

        const op = createAddOp(baseKey, baseValue)

        expect(index._addToIndexOperation).to.have.been.calledOnce()
        expect(index._addToIndexOperation).to.have.been.calledWith(baseKey, baseValue)
        expect(op).to.be.eql(fakeIndexOp)
      })

      it('does not add puts for items that are not in the filter', () => {
        filter.returns(false)
        index._rebuildIndex()
        const createAddOp = migrateStore.args[0][2]

        const baseKey = 'hello'
        const baseValue = '{"there":"world"}'

        const op = createAddOp(baseKey, baseValue)

        return expect(op).to.be.undefined
      })
    })
  })
})
