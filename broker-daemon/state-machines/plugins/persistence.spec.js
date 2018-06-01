const { expect, sinon } = require('test/test-helper')

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
})
