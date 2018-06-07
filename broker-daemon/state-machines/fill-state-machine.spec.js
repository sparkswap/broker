const path = require('path')
const { expect, rewire, sinon, delay } = require('test/test-helper')

const FillStateMachine = rewire(path.resolve(__dirname, 'fill-state-machine'))

describe('FillStateMachine', () => {
  let Fill

  let store
  let logger
  let relayer
  let engine

  beforeEach(() => {
    Fill = sinon.stub()
    FillStateMachine.__set__('Fill', Fill)

    store = {
      sublevel: sinon.stub(),
      put: sinon.stub().callsArgAsync(2)
    }
    logger = {
      info: sinon.stub(),
      error: sinon.stub(),
      debug: sinon.stub()
    }
    relayer = {}
    engine = {}
  })

  describe('new', () => {
    it('exposes the store', () => {
      const fsm = new FillStateMachine({ store, logger, relayer, engine })

      expect(fsm).to.have.property('store', store)
    })

    it('exposes the logger', () => {
      const fsm = new FillStateMachine({ store, logger, relayer, engine })

      expect(fsm).to.have.property('logger', logger)
    })

    it('exposes the relayer', () => {
      const fsm = new FillStateMachine({ store, logger, relayer, engine })

      expect(fsm).to.have.property('relayer', relayer)
    })

    it('exposes the engine', () => {
      const fsm = new FillStateMachine({ store, logger, relayer, engine })

      expect(fsm).to.have.property('engine', engine)
    })

    it('does not save a copy in the store', () => {
      new FillStateMachine({ store, logger, relayer, engine }) // eslint-disable-line
      return expect(store.put).to.not.have.been.called
    })
  })

  describe('#tryTo', () => {
    let fsm

    beforeEach(() => {
      fsm = new FillStateMachine({ store, logger, relayer, engine })
      fsm.goto('created')
    })

    it('moves to rejected if using an invalid transition', async () => {
      fsm.reject = sinon.stub()

      fsm.tryTo('blergh')

      await delay(10)

      expect(fsm.reject).to.have.been.calledOnce()
    })
  })

  describe('#persist', () => {
    let fsm
    let key

    beforeEach(() => {
      fsm = new FillStateMachine({ store, logger, relayer, engine })
      fsm.fill = {
        valueObject: { my: 'fill' }
      }
      key = 'fakeKey'
    })

    it('throws if no key is available', () => {
      return expect(fsm.persist()).to.eventually.be.rejectedWith(Error)
    })

    it('stringifies values', async () => {
      await fsm.persist(key)

      expect(store.put).to.have.been.calledOnce()
      expect(store.put).to.have.been.calledWith(sinon.match.any, sinon.match.string)
    })

    it('uses the key to save values', async () => {
      await fsm.persist(key)

      expect(store.put).to.have.been.calledOnce()
      expect(store.put).to.have.been.calledWith(key)
    })

    it('saves state machine data in the database', async () => {
      await fsm.persist(key)

      expect(store.put).to.have.been.calledWith(sinon.match.any, sinon.match('{"state":"none","fill":{"my":"fill"},"history":[]}'))
    })

    it('saves the fill to the database', async () => {
      await fsm.persist(key)

      expect(store.put).to.have.been.calledWith(sinon.match.any, sinon.match('"my":"fill"'))
    })

    it('saves the state in the database', async () => {
      await fsm.persist(key)

      expect(store.put).to.have.been.calledWith(sinon.match.any, sinon.match('"state":"none"'))
    })

    it('saves history in the database', async () => {
      await fsm.goto('created')
      await fsm.persist(key)

      expect(store.put).to.have.been.calledWith(sinon.match.any, sinon.match('"history":["created"]'))
    })

    it('saves error in the database', async () => {
      fsm.error = new Error('fakeError')
      await fsm.persist(key)

      expect(store.put).to.have.been.calledWith(sinon.match.any, sinon.match('"error":"fakeError"'))
    })
  })

  describe('#goto', () => {
    let fsm

    beforeEach(() => {
      fsm = new FillStateMachine({ store, logger, relayer, engine })
    })

    it('moves the state to the given state', async () => {
      await fsm.goto('created')

      expect(fsm.state).to.be.equal('created')
    })

    it('does not save a copy in the store', async () => {
      await fsm.goto('created')

      return expect(store.put).to.not.have.been.called
    })
  })

  describe('#reject', () => {
    let fsm
    let onRejection

    beforeEach(async () => {
      onRejection = sinon.stub()
      fsm = new FillStateMachine({ store, logger, relayer, engine, onRejection })
      await fsm.goto('created')
      fsm.fill = {
        key: 'fakeKey',
        valueObject: { my: 'object' }
      }
    })

    it('moves to the rejected state', async () => {
      await fsm.reject()

      expect(fsm.state).to.be.equal('rejected')
    })

    it('assigns an error for the rejected state', async () => {
      const fakeError = new Error('my error')
      await fsm.reject(fakeError)

      expect(fsm.error).to.be.equal(fakeError)
    })

    it('saves in the rejected state', async () => {
      await fsm.reject()

      expect(store.put).to.have.been.calledOnce()
      expect(store.put).to.have.been.calledWith(fsm.fill.key, sinon.match('"state":"rejected"'))
    })

    it('calls an onRejection function', async () => {
      const err = new Error('fake')
      await fsm.reject(err)

      expect(onRejection).to.have.been.calledOnce()
      expect(onRejection).to.have.been.calledWith(err)
    })
  })

  describe('::getAll', () => {
    let fakeRecords
    let fakeFill
    let state
    let store
    let logger

    beforeEach(() => {
      state = 'none'

      fakeRecords = [ ['fakeKey', JSON.stringify({
        fill: { my: 'object' },
        state
      })] ]

      store = {
        put: sinon.stub(),
        get: sinon.stub(),
        createReadStream: sinon.stub().callsFake(() => {
          return {
            on: async function (event, fn) {
              if (event === 'data') {
                for (var i = 0; i < fakeRecords.length; i++) {
                  await delay(5)
                  fn({ key: fakeRecords[i][0], value: fakeRecords[i][1] })
                }
              } else if (event === 'end') {
                await delay(fakeRecords.length * 5 + 5)
                fn()
              }
            }
          }
        })
      }

      logger = {
        info: sinon.stub(),
        debug: sinon.stub(),
        error: sinon.stub()
      }

      fakeFill = 'myorder'
      Fill.fromObject = sinon.stub().returns(fakeFill)
    })

    it('gets all records from the store', async () => {
      await FillStateMachine.getAll({ store, logger })

      expect(store.createReadStream).to.have.been.calledOnce()
    })

    it('instantiates an FillStateMachine for each record', async () => {
      const fsms = await FillStateMachine.getAll({ store, logger })

      expect(fsms).to.have.lengthOf(1)
      expect(fsms[0]).to.be.instanceOf(FillStateMachine)
    })

    it('moves the FillStateMachine to the correct state', async () => {
      const fsms = await FillStateMachine.getAll({ store, logger })

      expect(fsms).to.have.lengthOf(1)
      expect(fsms[0]).to.have.property('state', state)
    })

    it('assigns the fill to the state machine', async () => {
      const fsms = await FillStateMachine.getAll({ store, logger })

      expect(fsms[0].fill).to.be.eql(fakeFill)
    })
  })

  describe('::fromStore', () => {
    let key
    let state
    let history
    let error
    let valueObject
    let value

    beforeEach(() => {
      Fill.fromObject = sinon.stub().returns({
        valueObject: {}
      })
      key = 'fakeKey'
      state = 'created'
      history = []
      error = undefined
      valueObject = {
        fill: { my: 'object' },
        state,
        history,
        error
      }
      value = JSON.stringify(valueObject)
    })

    it('initializes a state machine', async () => {
      const fsm = await FillStateMachine.fromStore({ store, logger, relayer, engine }, { key, value })

      expect(fsm).to.be.instanceOf(FillStateMachine)
      expect(fsm).to.have.property('store', store)
    })

    it('moves to the correct state', async () => {
      const fsm = await FillStateMachine.fromStore({ store, logger, relayer, engine }, { key, value })

      expect(fsm.state).to.be.equal(state)
    })

    it('contains the old history', async () => {
      history.push('created')
      value = JSON.stringify(valueObject)
      const fsm = await FillStateMachine.fromStore({ store, logger, relayer, engine }, { key, value })

      expect(fsm.history).to.be.an('array')
      expect(fsm.history).to.have.lengthOf(1)
      expect(fsm.history[0]).to.be.eql('created')
    })

    it('does not include the re-inflating in history', async () => {
      const fsm = await FillStateMachine.fromStore({ store, logger, relayer, engine }, { key, value })

      expect(fsm.history).to.be.an('array')
      expect(fsm.history).to.have.lengthOf(0)
    })

    it('includes saved errors', async () => {
      valueObject.error = 'fakeError'
      value = JSON.stringify(valueObject)

      const fsm = await FillStateMachine.fromStore({ store, logger, relayer, engine }, { key, value })

      expect(fsm.error).to.be.an('error')
      expect(fsm.error.message).to.be.eql('fakeError')
    })

    it('applies all the saved data', async () => {
      const myObject = 'fakeObject'
      Fill.fromObject.returns(myObject)

      const fsm = await FillStateMachine.fromStore({ store, logger, relayer, engine }, { key, value })

      expect(Fill.fromObject).to.have.been.calledOnce()
      expect(Fill.fromObject).to.have.been.calledWith(key, sinon.match({ my: 'object' }))
      expect(fsm.fill).to.be.equal(myObject)
    })
  })
})
