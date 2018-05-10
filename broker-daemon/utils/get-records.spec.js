const { chai, sinon } = require('test/test-helper')
const { expect } = chai

const getRecords = require('./get-records')

describe('getRecords', () => {
  let store
  let stream
  let eachRecord
  let params

  beforeEach(() => {
    stream = {
      on: sinon.stub()
    }
    store = {
      createReadStream: sinon.stub().returns(stream)
    }
    eachRecord = sinon.stub()
    params = {}
  })

  it('returns a promise', () => {
    expect(getRecords(store, eachRecord, params)).to.be.a('promise')
  })

  it('creates a readstream from the store', () => {
    getRecords(store, eachRecord, params)

    expect(store.createReadStream).to.have.been.calledOnce()
    expect(store.createReadStream).to.have.been.calledWith(sinon.match(params))
  })

  it('passes through params to the readstream', () => {
    params = {
      reverse: true
    }

    getRecords(store, eachRecord, params)
    expect(store.createReadStream).to.have.been.calledWith(sinon.match(params))
  })

  it('sets an error handler', () => {
    getRecords(store, eachRecord, params)

    expect(stream.on).to.have.been.calledWith('error', sinon.match.func)
  })

  it('sets an end handler', () => {
    getRecords(store, eachRecord, params)

    expect(stream.on).to.have.been.calledWith('end', sinon.match.func)
  })

  it('sets an data handler', () => {
    getRecords(store, eachRecord, params)

    expect(stream.on).to.have.been.calledWith('data', sinon.match.func)
  })

  it('rejects on error', async () => {
    stream.on.withArgs('error').callsArgWithAsync(1, new Error('fake error'))
    return expect(getRecords(store, eachRecord, params)).to.be.rejectedWith(Error)
  })

  it('resolves on end', async () => {
    stream.on.withArgs('end').callsArgAsync(1)
    expect(await getRecords(store, eachRecord, params)).to.be.eql([])
  })

  it('processes records through eachRecord', async () => {
    const fakeRecord = { key: 'mykey', value: 'myvalue' }
    const fakeProcessed = { hello: 'world' }
    eachRecord.returns(fakeProcessed)

    stream.on.withArgs('data').callsArgWithAsync(1, fakeRecord)
    stream.on.withArgs('end').callsArgAsync(1)

    const records = await getRecords(store, eachRecord, params)

    expect(eachRecord).to.have.been.calledOnce()
    expect(eachRecord).to.have.been.calledWith(sinon.match(fakeRecord.key), sinon.match(fakeRecord.value))
    expect(records).to.have.lengthOf(1)
    expect(records).to.be.eql([fakeProcessed])
  })
})
