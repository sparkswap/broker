const path = require('path')
const { sinon, rewire, expect } = require('test/test-helper')

const getRecords = rewire(path.resolve(__dirname, 'get-records'))

describe('getRecords', () => {
  let eachRecord
  let store
  let fn
  let params

  beforeEach(() => {
    eachRecord = sinon.stub()
    eachRecord.resolves()

    getRecords.__set__('eachRecord', eachRecord)

    store = {}
    fn = sinon.stub()
    params = {}
  })

  it('returns a promise', () => {
    expect(getRecords(store, fn, params)).to.be.instanceOf(Promise)
  })

  it('resolves an empty array if no records are processed', async () => {
    expect(await getRecords(store, fn, params)).to.be.eql([])
  })

  it('uses eachRecord to process each record', async () => {
    await getRecords(store, fn, params)

    expect(eachRecord).to.have.been.calledOnce()
    expect(eachRecord).to.have.been.calledWith(store, sinon.match.func, params)
  })

  it('processes each record', async () => {
    const fakeRecords = [
      { key: 'key1', value: 'val1' },
      { key: 'key2', value: 'val2' }
    ]

    eachRecord.callsFake((store, fn) => {
      fakeRecords.forEach(({ key, value }) => {
        fn(key, value)
      })
    })

    await getRecords(store, fn, params)

    expect(fn).to.have.been.calledTwice()
    expect(fn).to.have.been.calledWith('key1', 'val1')
    expect(fn).to.have.been.calledWith('key2', 'val2')
  })

  it('returns the processed records', async () => {
    const fakeRecords = [
      { key: 'key1', value: 'val1' },
      { key: 'key2', value: 'val2' }
    ]

    fn.withArgs('key1', 'val1').returns('record1')
    fn.withArgs('key2', 'val2').returns('record2')

    eachRecord.callsFake((store, fn) => {
      fakeRecords.forEach(({ key, value }) => {
        fn(key, value)
      })
    })

    const records = await getRecords(store, fn, params)

    expect(records).to.have.lengthOf(2)
    expect(records[0]).to.be.eql('record1')
    expect(records[1]).to.be.eql('record2')
  })
})
