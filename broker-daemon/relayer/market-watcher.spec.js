const path = require('path')
const { sinon, rewire, expect } = require('test/test-helper')

const MarketWatcher = rewire(path.resolve(__dirname, 'market-watcher.js'))

describe('MarketWatcher', () => {
  let migrateStore
  let MarketEvent
  let Checksum
  let eachRecord
  let logger
  let watcher
  let store
  let RESPONSE_TYPES = {
    EXISTING_EVENT: 'EXISTING_EVENT',
    EXISTING_EVENTS_DONE: 'EXISTING_EVENTS_DONE',
    NEW_EVENT: 'NEW_EVENT',
    START_OF_EVENTS: 'START_OF_EVENTS'
  }
  let setupListeners
  let populateChecksum
  let delayProcessingFor
  let setupListenersStub
  let populateChecksumStub
  let delayProcessingForStub
  let onStub
  let emitStub
  let removeListenerStub

  beforeEach(() => {
    logger = {
      debug: sinon.stub(),
      info: sinon.stub(),
      error: sinon.stub()
    }
    watcher = {
      on: sinon.stub(),
      removeAllListeners: sinon.stub()
    }
    store = {
      put: sinon.stub()
    }
    onStub = sinon.stub()
    emitStub = sinon.stub()
    removeListenerStub = sinon.stub()

    MarketEvent = sinon.stub()
    MarketEvent.fromStorage = sinon.stub()
    migrateStore = sinon.stub().resolves()
    Checksum = sinon.stub()
    Checksum.prototype.process = sinon.stub()
    eachRecord = sinon.stub().resolves()

    MarketWatcher.__set__('MarketEvent', MarketEvent)
    MarketWatcher.__set__('migrateStore', migrateStore)
    MarketWatcher.__set__('Checksum', Checksum)
    MarketWatcher.__set__('eachRecord', eachRecord)

    populateChecksum = MarketWatcher.prototype.populateChecksum
    setupListeners = MarketWatcher.prototype.setupListeners
    delayProcessingFor = MarketWatcher.prototype.delayProcessingFor
    populateChecksumStub = sinon.stub()
    setupListenersStub = sinon.stub()
    delayProcessingForStub = sinon.stub()

    MarketWatcher.prototype.populateChecksum = populateChecksumStub
    MarketWatcher.prototype.setupListeners = setupListenersStub
    MarketWatcher.prototype.delayProcessingFor = delayProcessingForStub
    MarketWatcher.prototype.on = onStub
    MarketWatcher.prototype.emit = emitStub
    MarketWatcher.prototype.removeListener = removeListenerStub
  })

  afterEach(() => {
    MarketWatcher.prototype.populateChecksum = populateChecksum
    MarketWatcher.prototype.setupListeners = setupListeners
    MarketWatcher.prototype.delayProcessingFor = delayProcessingFor
  })

  describe('new', () => {
    let mw

    beforeEach(() => {
      mw = new MarketWatcher(watcher, store, RESPONSE_TYPES, logger)
    })

    it('assigns a logger', () => {
      expect(mw).to.have.property('logger', logger)
    })

    it('assigns a store', () => {
      expect(mw).to.have.property('store', store)
    })

    it('assigns a watcher', () => {
      expect(mw).to.have.property('watcher', watcher)
    })

    it('assigns a RESPONSE_TYPES', () => {
      expect(mw).to.have.property('RESPONSE_TYPES', RESPONSE_TYPES)
    })

    it('creates a Set to track promises to delay processing for', () => {
      expect(mw).to.have.property('finishBeforeProcessing')
      expect(mw.finishBeforeProcessing).to.be.an.instanceOf(Set)
      expect(mw.finishBeforeProcessing.size).to.be.eql(0)
    })

    it('sets up listeners', () => {
      expect(setupListenersStub).to.have.been.calledOnce()
      expect(setupListenersStub).to.have.been.calledOn(mw)
    })

    it('creates a checksum', () => {
      expect(Checksum).to.have.been.calledOnce()
      expect(Checksum).to.have.been.calledWithNew()
      expect(mw.checksum).to.be.an.instanceOf(Checksum)
    })

    it('populates the checksum', () => {
      expect(populateChecksumStub).to.have.been.calledOnce()
      expect(populateChecksumStub).to.have.been.calledOn(mw)
    })
  })

  describe('#setupListeners', () => {
    let mw

    beforeEach(() => {
      MarketWatcher.prototype.setupListeners = setupListeners
      mw = new MarketWatcher(watcher, store, RESPONSE_TYPES, logger)
    })

    it('tears down listeners after completing watch', () => {
      expect(onStub).to.have.been.calledTwice()
      expect(onStub).to.have.been.calledWith('end', sinon.match.func)
      const onEnd = onStub.args[0][1]

      onEnd()

      expect(removeListenerStub).to.have.been.calledTwice()
      expect(removeListenerStub).to.have.been.calledWith('end', onEnd)
      expect(removeListenerStub).to.have.been.calledWith('error', onEnd)
      expect(watcher.removeAllListeners).to.have.been.calledOnce()
    })

    it('tears down listeners after erroring a watch', () => {
      expect(onStub).to.have.been.calledTwice()
      expect(onStub).to.have.been.calledWith('error', sinon.match.func)
      const onError = onStub.args[0][1]

      onError()

      expect(removeListenerStub).to.have.been.calledTwice()
      expect(removeListenerStub).to.have.been.calledWith('end', onError)
      expect(removeListenerStub).to.have.been.calledWith('error', onError)
      expect(watcher.removeAllListeners).to.have.been.calledOnce()
    })

    it('handles end events from the wather', () => {
      expect(watcher.on).to.have.been.calledWith('end', sinon.match.func)

      const onEnd = watcher.on.withArgs('end').args[0][1]

      onEnd()

      expect(emitStub).to.have.been.calledOnce()
      expect(emitStub).to.have.been.calledWith('end')
    })

    it('handles error events from the watcher', () => {
      expect(watcher.on).to.have.been.calledWith('error', sinon.match.func)

      const onError = watcher.on.withArgs('error').args[0][1]
      const fakeError = new Error('fake error')

      onError(fakeError)

      expect(emitStub).to.have.been.calledOnce()
      expect(emitStub).to.have.been.calledWith('end', fakeError)
    })

    it('handles incoming data from the watcher', () => {
      mw.handleResponse = sinon.stub()

      expect(watcher.on).to.have.been.calledWith('data', sinon.match.func)

      const onData = watcher.on.withArgs('data').args[0][1]
      const fakeResp = {}

      onData(fakeResp)

      expect(mw.handleResponse).to.have.been.calledOnce()
      expect(mw.handleResponse).to.have.been.calledWith(fakeResp)
    })
  })

  describe('#populateChecksum', () => {
    let mw

    beforeEach(() => {
      MarketWatcher.prototype.populateChecksum = populateChecksum
      mw = new MarketWatcher(watcher, store, RESPONSE_TYPES, logger)
    })

    it('processes each record in the store', () => {
      expect(eachRecord).to.have.been.calledOnce()
      expect(eachRecord).to.have.been.calledWith(mw.store, sinon.match.func)
    })

    it('adds each record to the checksum', () => {
      const eachRecordFn = eachRecord.args[0][1]
      const key = 'mykey'
      const value = 'myvalue'
      const event = {
        orderId: 'fakeId'
      }
      MarketEvent.fromStorage.withArgs(key, value).returns(event)

      eachRecordFn(key, value)

      expect(MarketEvent.fromStorage).to.have.been.calledOnce()
      expect(MarketEvent.fromStorage).to.have.been.calledWith(key, value)
      expect(mw.checksum.process).to.have.been.calledOnce()
      expect(mw.checksum.process).to.have.been.calledWith(event.orderId)
    })

    it('delays processing for its promise', () => {
      const fakePromise = new Promise(() => {})
      eachRecord.returns(fakePromise)
      mw.populateChecksum()

      expect(mw.delayProcessingFor).to.have.been.calledWith(fakePromise)
    })
  })

  describe('#handleResponse', () => {
    let mw
    let response

    beforeEach(() => {
      mw = new MarketWatcher(watcher, store, RESPONSE_TYPES, logger)

      mw.delayProcessing = sinon.stub().resolves()
      mw.upToDate = sinon.stub()
      mw.migrate = sinon.stub()
      mw.createMarketEvent = sinon.stub()

      response = {}
    })

    it('waits for delayProcessing to be finished', async () => {
      let waited = false

      mw.delayProcessing.callsFake(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            waited = true
            resolve()
          }, 10)
        })
      })

      await mw.handleResponse(response)

      expect(waited).to.be.true()
    })

    context('DONE events', () => {
      beforeEach(async () => {
        response.type = RESPONSE_TYPES.EXISTING_EVENTS_DONE
        await mw.handleResponse(response)
      })

      it('tries to mark as up to date', () => {
        expect(mw.upToDate).to.have.been.calledOnce()
        expect(mw.upToDate).to.have.been.calledWith(response)
      })
    })

    context('START events', () => {
      beforeEach(async () => {
        response.type = RESPONSE_TYPES.START_OF_EVENTS
        await mw.handleResponse(response)
      })

      it('starts a migration of the existing store', () => {
        expect(mw.migrate).to.have.been.calledOnce()
      })
    })

    context('EXISTING events', () => {
      beforeEach(async () => {
        response.type = RESPONSE_TYPES.EXISTING_EVENT
        await mw.handleResponse(response)
      })

      it('creates market events', () => {
        expect(mw.createMarketEvent).to.have.been.calledOnce()
        expect(mw.createMarketEvent).to.have.been.calledWith(response)
      })
    })

    context('NEW events', () => {
      beforeEach(async () => {
        response.type = RESPONSE_TYPES.NEW_EVENT
        response.checksum = 'fakechecksum'
        mw.validateChecksum = sinon.stub()
        await mw.handleResponse(response)
      })

      it('creates market events', () => {
        expect(mw.createMarketEvent).to.have.been.calledOnce()
        expect(mw.createMarketEvent).to.have.been.calledWith(response)
      })

      it('validates the checksum', () => {
        expect(mw.validateChecksum).to.have.been.calledOnce()
        expect(mw.validateChecksum).to.have.been.calledWith(response.checksum)
        expect(mw.validateChecksum).to.have.been.calledAfter(mw.createMarketEvent)
      })
    })

    it('handles unknown events', async () => {
      response.type = 'BUASDFASDIFJ'

      await mw.handleResponse(response)

      expect(mw.upToDate).to.not.have.been.called()
      expect(mw.migrate).to.not.have.been.called()
      expect(mw.createMarketEvent).to.not.have.been.called()
    })
  })

  describe('#migrate', () => {
    let mw
    let migrate
    let fakePromise

    beforeEach(async () => {
      mw = new MarketWatcher(watcher, store, RESPONSE_TYPES, logger)
      fakePromise = 'mypromise'
      migrateStore.returns(fakePromise)
      migrate = await mw.migrate()
    })

    it('deletes all events in the store', () => {
      expect(migrateStore).to.have.been.calledOnce()
      expect(migrateStore).to.have.been.calledWith(store, store, sinon.match.func)

      const migration = migrateStore.args[0][2]
      const fakeKey = 'mykey'
      expect(migration(fakeKey)).to.be.eql({ type: 'del', key: fakeKey })
    })

    it('delays processing until its promise is completed', () => {
      expect(mw.delayProcessingFor).to.have.been.calledWith(fakePromise)
    })

    it('returns the promise for deletion', () => {
      expect(migrate).to.be.eql(fakePromise)
    })
  })

  describe('#delayProcessingFor', () => {
    let mw

    beforeEach(() => {
      mw = new MarketWatcher(watcher, store, RESPONSE_TYPES, logger)
      mw.delayProcessingFor = delayProcessingFor
    })

    it('adds promises to the set', () => {
      const fakePromise = 'mypromise'
      mw.delayProcessingFor(fakePromise)

      expect(mw.finishBeforeProcessing.size).to.be.eql(1)
      expect(mw.finishBeforeProcessing.has(fakePromise)).to.be.eql(true)
    })
  })

  describe('#delayProcessing', () => {
    let mw

    beforeEach(() => {
      mw = new MarketWatcher(watcher, store, RESPONSE_TYPES, logger)
    })

    it('waits for all promises in the set to be complete before running', async () => {
      let waitedOnce = false
      let waitedTwice = false

      mw.finishBeforeProcessing.add(new Promise((resolve) => {
        setTimeout(() => {
          waitedOnce = true
          resolve()
        }, 10)
      }))

      mw.finishBeforeProcessing.add(new Promise((resolve) => {
        setTimeout(() => {
          waitedTwice = true
          resolve()
        }, 10)
      }))

      await mw.delayProcessing()

      expect(waitedOnce).to.be.true()
      expect(waitedTwice).to.be.true()
    })

    it('returns immediately if all promises are resolved', async () => {
      let waited = false

      mw.finishBeforeProcessing.add(new Promise((resolve) => {
        resolve()
      }))

      setImmediate(() => {
        waited = true
      })

      await mw.delayProcessing()

      expect(waited).to.be.false()
    })

    it('returns immediately if the set is empty', async () => {
      let waited = false

      setImmediate(() => {
        waited = true
      })

      await mw.delayProcessing()

      expect(waited).to.be.false()
    })

    it('removes resolved promises from the set on completion', async () => {
      mw.finishBeforeProcessing.add(new Promise((resolve) => {
        resolve()
      }))

      expect(mw.finishBeforeProcessing.size).to.be.eql(1)

      await mw.delayProcessing()

      expect(mw.finishBeforeProcessing.size).to.be.eql(0)
    })

    xit('does not remove unresolved promises from the set', () => {
      mw.finishBeforeProcessing.add(new Promise((resolve) => {
        resolve()
      }))

      expect(mw.finishBeforeProcessing.size).to.be.eql(1)

      mw.delayProcessing().then(() => {
        // the second promise should still be in the set since
        // it was added after we started waiting on the set
        expect(mw.finishBeforeProcessing.size).to.be.eql(1)
      })

      mw.finishBeforeProcessing.add(new Promise(() => {}))

      expect(mw.finishBeforeProcessing.size).to.be.eql(2)
    })
  })

  describe('#createMarketEvent', () => {
    let mw
    let response
    let marketEvent
    let key
    let value
    let orderId

    beforeEach(() => {
      mw = new MarketWatcher(watcher, store, RESPONSE_TYPES, logger)
      mw.checksum = {
        process: sinon.stub()
      }
      marketEvent = 'fake market event'
      response = {
        marketEvent
      }
      key = 'fakeKey'
      value = 'fakeValue'
      orderId = 'fakeId'

      MarketEvent.callsFake(function () {
        this.key = key
        this.value = value
        this.orderId = orderId
      })

      mw.createMarketEvent(response)
    })

    it('creates a market event', () => {
      expect(MarketEvent).to.have.been.calledOnce()
      expect(MarketEvent).to.have.been.calledWithNew()
      expect(MarketEvent).to.have.been.calledWith(marketEvent)
    })

    it('adds the market event to the checksum', () => {
      expect(mw.checksum.process).to.have.been.calledOnce()
      expect(mw.checksum.process).to.have.been.calledWith(orderId)
    })

    it('puts the market event in the store', () => {
      expect(store.put).to.have.been.calledOnce()
      expect(store.put).to.have.been.calledWith(key, value)
    })

    it('emits an error if there as an error persisting the market event', async () => {
      const fakeError = new Error('fake error')
      store.put.callsArgWith(2, fakeError)

      await mw.createMarketEvent(response)

      expect(mw.emit).to.have.been.calledOnce()
      expect(mw.emit).to.have.been.calledWith('error', fakeError)
    })

    it('does not emit an error if the market event was persisted', async () => {
      store.put.callsArg(2)

      await mw.createMarketEvent(response)

      expect(mw.emit).to.not.have.been.called()
    })
  })

  describe('#upToDate', () => {
    let mw
    let checksum

    beforeEach(() => {
      mw = new MarketWatcher(watcher, store, RESPONSE_TYPES, logger)
      mw.validateChecksum = sinon.stub().returns(true)
      checksum = 'fake checksum'
    })

    it('validates the checksum', () => {
      mw.upToDate({ checksum })

      expect(mw.validateChecksum).to.have.been.calledOnce()
      expect(mw.validateChecksum).to.have.been.calledWith(checksum)
    })

    it('emits a sync event if the checksum passes', () => {
      mw.upToDate({ checksum })

      expect(emitStub).to.have.been.calledOnce()
      expect(emitStub).to.have.been.calledWith('sync')
    })

    it('does not emit a sync event if the checksum fails', () => {
      mw.validateChecksum.returns(false)

      mw.upToDate({ checksum })

      expect(emitStub).to.not.have.been.called()
    })
  })

  describe('#validateChecksum', () => {
    let mw
    let checksum
    let checksumBuf
    let matchesStub

    beforeEach(() => {
      mw = new MarketWatcher(watcher, store, RESPONSE_TYPES, logger)
      matchesStub = sinon.stub()
      mw.checksum = {
        matches: matchesStub
      }
      checksum = 'fakechecksum'
      checksumBuf = Buffer.from(checksum, 'base64')
    })

    it('checks that a Buffer of the provided sum matches', () => {
      mw.validateChecksum(checksum)

      expect(matchesStub).to.have.been.calledOnce()
      expect(matchesStub.args[0][0].equals(checksumBuf)).to.be.true()
    })

    it('returns true if the sum matches', () => {
      matchesStub.returns(true)

      expect(mw.validateChecksum(checksum)).to.be.true()
    })

    it('returns false if the sum does not match', () => {
      matchesStub.returns(false)

      expect(mw.validateChecksum(checksum)).to.be.false()
    })

    it('emits an error if the sum does not match', () => {
      matchesStub.returns(false)

      mw.validateChecksum(checksum)

      expect(emitStub).to.have.been.calledOnce()
      expect(emitStub).to.have.been.calledWith('error')
      expect(emitStub.args[0][1]).to.be.an.instanceOf(Error)
    })

    it('does not emit if the sum matches', () => {
      matchesStub.returns(true)

      mw.validateChecksum(checksum)

      expect(emitStub).to.not.have.been.called()
    })
  })
})
