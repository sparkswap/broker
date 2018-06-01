const { expect, sinon, delay } = require('test/test-helper')

const StateMachinePersistence = require('./persistence')
const StateMachine = require('../state-machine')

describe('StateMachinePersistence', () => {
  describe('#persist', () => {
    let Machine
    let machine
    let key
    let store
    let blergh

    beforeEach(() => {
      blergh = sinon.stub().returns('hello')
      Machine = StateMachine.factory({
        plugins: [
          new StateMachinePersistence({
            additionalFields: {
              blergh
            }
          })
        ],
        data: function ({ store }) {
          return { store }
        }
      })
      store = {
        put: sinon.stub().callsArgAsync(2)
      }
      machine = new Machine({ store })
      key = 'fakeKey'
    })

    it('throws if no key is available', () => {
      return expect(machine.persist()).to.eventually.be.rejectedWith(Error)
    })

    it('stringifies values', async () => {
      await machine.persist(key)

      expect(store.put).to.have.been.calledOnce()
      expect(store.put).to.have.been.calledWith(sinon.match.any, sinon.match.string)
    })

    it('uses the key to save values', async () => {
      await machine.persist(key)

      expect(store.put).to.have.been.calledOnce()
      expect(store.put).to.have.been.calledWith(key)
    })

    it('saves the default state in the database', async () => {
      await machine.persist(key)

      expect(JSON.parse(store.put.args[0][1])).to.have.property('state', 'none')
    })

    it('saves another state in the database', async () => {

    })

    it('saves arbitrary data to the database', async () => {
      await machine.persist(key)

      expect(JSON.parse(store.put.args[0][1])).to.have.property('blergh', 'hello')
    })

    it('uses user-defined getters to get data for the database', async () => {
      await machine.persist(key)

      expect(blergh).to.have.been.calledOnce()
      expect(blergh).to.have.been.calledOn(machine)
    })
  })

  describe('::get', () => {
    let Machine
    let state
    let store
    let blergh
    let blerghValue
    let key
    let badKey
    let value

    beforeEach(() => {
      blergh = sinon.stub().callsFake(function (blergh) {
        if (blergh) {
          this.blergh = blergh
        }

        return this.blergh
      })

      Machine = StateMachine.factory({
        plugins: [
          new StateMachinePersistence({
            additionalFields: {
              blergh
            }
          })
        ],
        data: function ({ store }) {
          return { store }
        },
        transitions: [
          { name: 'step', from: 'none', to: 'first' }
        ]
      })

      blerghValue = 'hello'
      state = 'first'

      key = 'fakeKey'
      badKey = 'hello'
      value = JSON.stringify({
        blergh: blerghValue,
        state
      })

      const storeGet = sinon.stub()
      storeGet.withArgs(key).callsArgWithAsync(1, null, value)
      storeGet.withArgs(badKey).callsArgWithAsync(1, new Error('fake error'))

      store = {
        put: sinon.stub(),
        get: storeGet,
        createReadStream: sinon.stub()
      }
    })

    it('get the record from the store', async () => {
      await Machine.get(key, { store })

      expect(store.get).to.have.been.calledOnce()
      expect(store.get).to.have.been.calledWith(key)
    })

    it('errors if no record is found', async () => {
      return expect(Machine.get(badKey, { store })).to.eventually.be.rejectedWith(Error)
    })

    it('instantiates a Machine for the record', async () => {
      const machine = await Machine.get(key, { store })

      expect(machine).to.be.instanceOf(Machine)
    })

    it('moves the Machine to the correct state', async () => {
      const machine = await Machine.get(key, { store })

      expect(machine).to.have.property('state', state)
    })

    it('assigns arbitrary data to the state machine', async () => {
      const machine = await Machine.get(key, { store })

      expect(machine).to.have.property('blergh', blerghValue)
    })

    it('calls user defined setters', async () => {
      const machine = await Machine.get(key, { store })

      expect(blergh).to.have.been.calledOnce()
      expect(blergh).to.have.been.calledOn(machine)
      expect(blergh).to.have.been.calledWith('hello')
    })
  })

  describe('::getAll', () => {
    let fakeRecords
    let Machine
    let state
    let store
    let blergh
    let blerghValue

    beforeEach(() => {
      blergh = sinon.stub().callsFake(function (blergh) {
        if (blergh) {
          this.blergh = blergh
        }

        return this.blergh
      })

      Machine = StateMachine.factory({
        plugins: [
          new StateMachinePersistence({
            additionalFields: {
              blergh
            }
          })
        ],
        data: function ({ store }) {
          return { store }
        },
        transitions: [
          { name: 'step', from: 'none', to: 'first' }
        ]
      })

      blerghValue = 'hello'
      state = 'first'

      fakeRecords = [ ['fakeKey', JSON.stringify({
        blergh: blerghValue,
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
    })

    it('gets all records from the store', async () => {
      await Machine.getAll({ store })

      expect(store.createReadStream).to.have.been.calledOnce()
    })

    it('instantiates an Machine for each record', async () => {
      const machines = await Machine.getAll({ store })

      expect(machines).to.have.lengthOf(1)
      expect(machines[0]).to.be.instanceOf(Machine)
    })

    it('moves the Machine to the correct state', async () => {
      const machines = await Machine.getAll({ store })

      expect(machines[0]).to.have.property('state', state)
    })

    it('assigns arbitrary data to the state machine', async () => {
      const machines = await Machine.getAll({ store })

      expect(machines[0]).to.have.property('blergh', blerghValue)
    })

    it('calls user defined setters', async () => {
      const machines = await Machine.getAll({ store })

      expect(blergh).to.have.been.calledOnce()
      expect(blergh).to.have.been.calledOn(machines[0])
      expect(blergh).to.have.been.calledWith('hello')
    })
  })

  describe('::fromStore', () => {
    let Machine
    let key
    let store
    let blergh
    let valueObject
    let value

    beforeEach(() => {
      blergh = sinon.stub().callsFake(function (blergh) {
        if (blergh) {
          this.blergh = blergh
        }

        return this.blergh
      })

      Machine = StateMachine.factory({
        plugins: [
          new StateMachinePersistence({
            additionalFields: {
              blergh
            }
          })
        ],
        data: function ({ store }) {
          return { store }
        },
        transitions: [
          { name: 'step', from: 'none', to: 'first' }
        ]
      })

      store = {
        put: sinon.stub()
      }

      key = 'fakeKey'
      valueObject = {
        state: 'none',
        blergh: 'hello'
      }
      value = JSON.stringify(valueObject)
    })

    it('initializes a state machine', async () => {
      const machine = await Machine.fromStore({ store }, { key, value })

      expect(machine).to.be.instanceOf(Machine)
    })

    it('moves to the default state', async () => {
      const machine = await Machine.fromStore({ store }, { key, value })

      expect(machine.state).to.be.equal('none')
    })

    it('moves to the stored state', async () => {
      valueObject.state = 'first'
      value = JSON.stringify(valueObject)
      const machine = await Machine.fromStore({ store }, { key, value })

      expect(machine.state).to.be.equal('first')
    })

    it('applies arbitrary saved data', async () => {
      const machine = await Machine.fromStore({ store }, { key, value })

      expect(machine.blergh).to.be.equal(valueObject.blergh)
    })

    it('calls user defined setters', async () => {
      const machine = await Machine.fromStore({ store }, { key, value })

      expect(blergh).to.have.been.calledOnce()
      expect(blergh).to.have.been.calledOn(machine)
      expect(blergh).to.have.been.calledWith('hello')
    })
  })
})
