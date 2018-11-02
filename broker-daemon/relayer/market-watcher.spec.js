const path = require('path')
const { sinon, rewire, expect } = require('test/test-helper')

const MarketWatcher = rewire(path.resolve(__dirname, 'market-watcher.js'))

describe('MarketWatcher', () => {
  let migrateStore
  let MarketEvent
  let logger
  let watcher
  let store
  let RESPONSE_TYPES = {
    EXISTING_EVENT: 'EXISTING_EVENT',
    EXISTING_EVENTS_DONE: 'EXISTING_EVENTS_DONE',
    NEW_EVENT: 'NEW_EVENT',
    START_OF_EVENTS: 'START_OF_EVENTS'
  }
  let onStub
  let emitStub
  let removeAllListenersStub

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
    removeAllListenersStub = sinon.stub()

    MarketEvent = sinon.stub()
    migrateStore = sinon.stub().resolves()

    MarketWatcher.__set__('MarketEvent', MarketEvent)
    MarketWatcher.__set__('migrateStore', migrateStore)

    MarketWatcher.prototype.on = onStub
    MarketWatcher.prototype.emit = emitStub
    MarketWatcher.prototype.removeAllListeners = removeAllListenersStub
  })

  describe('new', () => {
    it('assigns a logger', () => {
      const mw = new MarketWatcher(watcher, store, RESPONSE_TYPES, logger)

      expect(mw).to.have.property('logger')
      expect(mw.logger).to.be.equal(logger)
    })

    it('assigns a store', () => {
      const mw = new MarketWatcher(watcher, store, RESPONSE_TYPES, logger)

      expect(mw).to.have.property('store')
      expect(mw.store).to.be.equal(store)
    })

    it('assigns a watcher', () => {
      const mw = new MarketWatcher(watcher, store, RESPONSE_TYPES, logger)

      expect(mw).to.have.property('watcher')
      expect(mw.watcher).to.be.equal(watcher)
    })

    it('assigns a RESPONSE_TYPES', () => {
      const mw = new MarketWatcher(watcher, store, RESPONSE_TYPES, logger)

      expect(mw).to.have.property('RESPONSE_TYPES')
      expect(mw.RESPONSE_TYPES).to.be.equal(RESPONSE_TYPES)
    })

    it('creates a falsey value for migrating', () => {
      const mw = new MarketWatcher(watcher, store, RESPONSE_TYPES, logger)

      expect(mw).to.have.property('migrating')
      expect(mw.migrating).to.be.null()
    })

    it('sets up listeners', () => {
      const sl = MarketWatcher.prototype.setupListeners
      MarketWatcher.prototype.setupListeners = sinon.stub()

      const mw = new MarketWatcher(watcher, store, RESPONSE_TYPES, logger)

      expect(mw.setupListeners).to.have.been.calledOnce()

      MarketWatcher.prototype.setupListeners = sl
    })
  })

  describe('#setupListeners', () => {
    let mw

    beforeEach(() => {
      mw = new MarketWatcher(watcher, store, RESPONSE_TYPES, logger)
    })

    it('tears down listeners after completing watch', () => {
      expect(onStub).to.have.been.calledOnce()
      expect(onStub).to.have.been.calledWith('end', sinon.match.func)
      const onEnd = onStub.args[0][1]

      onEnd()

      expect(removeAllListenersStub).to.have.been.calledOnce()
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

  describe('#handleResponse', () => {
    let mw
    let response

    beforeEach(() => {
      mw = new MarketWatcher(watcher, store, RESPONSE_TYPES, logger)

      mw.migration = sinon.stub().resolves()
      mw.upToDate = sinon.stub()
      mw.migrate = sinon.stub()
      mw.createMarketEvent = sinon.stub()

      response = {}
    })

    it('waits for migration to be finished', async () => {
      let waited = false

      mw.migration.callsFake(() => {
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

    it('handles DONE events', async () => {
      response.type = RESPONSE_TYPES.EXISTING_EVENTS_DONE

      await mw.handleResponse(response)

      expect(mw.upToDate).to.have.been.calledOnce()
    })

    it('handles START events', async () => {
      response.type = RESPONSE_TYPES.START_OF_EVENTS

      await mw.handleResponse(response)

      expect(mw.migrate).to.have.been.calledOnce()
    })

    it('handles EXISTING events', async () => {
      response.type = RESPONSE_TYPES.EXISTING_EVENT

      await mw.handleResponse(response)

      expect(mw.createMarketEvent).to.have.been.calledOnce()
      expect(mw.createMarketEvent).to.have.been.calledWith(response)
    })

    it('handles NEW events', async () => {
      response.type = RESPONSE_TYPES.EXISTING_EVENT

      await mw.handleResponse(response)

      expect(mw.createMarketEvent).to.have.been.calledOnce()
      expect(mw.createMarketEvent).to.have.been.calledWith(response)
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

    it('assigns the promise for deletion to the `migrating` property', () => {
      expect(mw.migrating).to.be.eql(fakePromise)
    })

    it('returns the promise for deletion', () => {
      expect(migrate).to.be.eql(fakePromise)
    })
  })

  describe('#migration', () => {
    let mw

    beforeEach(() => {
      mw = new MarketWatcher(watcher, store, RESPONSE_TYPES, logger)
    })

    it('returns immediately if a migration has not started', async () => {
      let waited = false

      setTimeout(() => {
        waited = true
      }, 10)

      await mw.migration()

      expect(waited).to.be.false()
    })

    it('waits for migration to be done before returning', async () => {
      let waited = false

      mw.migrating = new Promise((resolve) => {
        setTimeout(() => {
          waited = true
          resolve()
        }, 10)
      })

      await mw.migration()

      expect(waited).to.be.true()
    })

    it('returns immediately if a migration has ended', async () => {
      let waited = false

      mw.migrating = new Promise((resolve) => {
        resolve()
      })

      setTimeout(() => {
        waited = true
      }, 10)

      await mw.migration()

      expect(waited).to.be.false()
    })
  })

  describe('#createMarketEvent', () => {
    let mw
    let response
    let marketEvent
    let key
    let value

    beforeEach(() => {
      mw = new MarketWatcher(watcher, store, RESPONSE_TYPES, logger)
      marketEvent = 'fake market event'
      response = {
        marketEvent
      }
      key = 'fakeKey'
      value = 'fakeValue'

      MarketEvent.callsFake(function () {
        this.key = key
        this.value = value
      })

      mw.createMarketEvent(response)
    })

    it('creates a market event', () => {
      expect(MarketEvent).to.have.been.calledOnce()
      expect(MarketEvent).to.have.been.calledWithNew()
      expect(MarketEvent).to.have.been.calledWith(marketEvent)
    })

    it('puts the market event in the store', () => {
      expect(store.put).to.have.been.calledOnce()
      expect(store.put).to.have.been.calledWith(key, value)
    })
  })

  describe('#upToDate', () => {
    let mw

    beforeEach(() => {
      mw = new MarketWatcher(watcher, store, RESPONSE_TYPES, logger)
      mw.upToDate()
    })

    it('emits a sync event', () => {
      expect(emitStub).to.have.been.calledOnce()
      expect(emitStub).to.have.been.calledWith('sync')
    })
  })
})
