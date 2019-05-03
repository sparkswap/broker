const path = require('path')
const { expect, rewire, sinon, timekeeper } = require('test/test-helper')

const CachedCall = rewire(path.resolve(__dirname, 'cached-call'))

describe('CachedCall', () => {
  let fakePromise
  let promiseFn
  let ttl
  let timestamp
  let cachedCall

  beforeEach(() => {
    timestamp = 1556830560529
    timekeeper.freeze(new Date(timestamp))
    fakePromise = 'a-fake-promise'
    promiseFn = sinon.stub().returns(fakePromise)
    ttl = 0
    cachedCall = new CachedCall(promiseFn, ttl)
  })

  afterEach(() => {
    timekeeper.reset()
  })

  describe('constructor', () => {
    it('assigns a promise function', () => {
      expect(cachedCall).to.have.property('promiseFn', promiseFn)
    })

    it('assigns a last call time', () => {
      const initialLastCallTime = CachedCall.__get__('INITIAL_LAST_CALL_TIME')
      expect(cachedCall).to.have.property('lastCallTime', initialLastCallTime)
    })

    it('assigns a last call promise', () => {
      expect(cachedCall).to.have.property('lastCallPromise', null)
    })

    it('assigns a time to live', () => {
      expect(cachedCall).to.have.property('ttl', ttl)
    })

    it('assigns a default ttl', () => {
      const timeToLive = CachedCall.__get__('CACHE_TTL')
      cachedCall = new CachedCall(promiseFn)
      expect(cachedCall).to.have.property('ttl', timeToLive)
    })
  })

  describe('#tryCall', () => {
    let lastCallPromise
    let originalLastCallPromise

    beforeEach(() => {
      lastCallPromise = 'a-cached-promise'
      originalLastCallPromise = cachedCall.lastCallPromise
      cachedCall.lastCallPromise = lastCallPromise
    })

    afterEach(() => {
      cachedCall.lastCallPromise = originalLastCallPromise
    })

    it('returns the cached promise of last call if it is still valid', () => {
      const isCachedStub = sinon.stub().returns(true)
      const originalIsCached = cachedCall.isCached
      cachedCall.isCached = isCachedStub

      const res = cachedCall.tryCall()
      cachedCall.isCached = originalIsCached

      expect(res).to.be.eql(lastCallPromise)
      expect(promiseFn).to.not.have.been.called()
    })

    it('calls the promise function if there is not a valid cache', () => {
      const isCachedStub = sinon.stub().returns(false)
      const originalIsCached = cachedCall.isCached
      cachedCall.isCached = isCachedStub

      const res = cachedCall.tryCall()
      cachedCall.isCached = originalIsCached

      expect(res).to.be.eql(fakePromise)
      expect(promiseFn).to.have.been.calledOnce()
    })

    it('updates the last call time when calling the promise function', () => {
      const isCachedStub = sinon.stub().returns(false)
      const originalIsCached = cachedCall.isCached
      cachedCall.isCached = isCachedStub

      expect(cachedCall.lastCallTime).to.be.eql(0)
      cachedCall.tryCall()
      cachedCall.isCached = originalIsCached

      expect(cachedCall.lastCallTime).to.be.eql(timestamp)
    })
  })

  describe('#isCached', () => {
    let originalLastCallTime
    let originalTtl

    beforeEach(() => {
      originalLastCallTime = cachedCall.lastCallTime
      originalTtl = cachedCall.ttl
    })

    afterEach(() => {
      cachedCall.lastCallTime = originalLastCallTime
      cachedCall.ttl = originalTtl
    })

    it('returns true if the last call is live', () => {
      cachedCall.lastCallTime = Date.now() - 1000
      cachedCall.ttl = 2000

      const res = cachedCall.isCached()
      expect(res).to.be.eql(true)
    })

    it('returns false if the last call is not live', () => {
      cachedCall.lastCallTime = Date.now() - 5000
      cachedCall.ttl = 2000

      const res = cachedCall.isCached()
      expect(res).to.be.eql(false)
    })
  })
})
