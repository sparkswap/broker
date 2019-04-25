const { expect, timekeeper } = require('test/test-helper')

const StateMachineDates = require('./state-machine-dates')
const StateMachine = require('../state-machine')

describe('StateMachineDates', () => {
  describe('observers', () => {
    let stateMachineDates
    let Machine
    let stateMachine
    let skipTransitions
    let now

    beforeEach(() => {
      skipTransitions = ['goto']
      now = new Date()
      timekeeper.freeze(now)
      stateMachineDates = new StateMachineDates({ skipTransitions })
      Machine = StateMachine.factory({
        plugins: [
          stateMachineDates
        ],
        transitions: [
          { name: 'create', from: 'none', to: 'created' },
          { name: 'place', from: 'created', to: 'placed' },
          { name: 'goto', from: '*', to: (s) => s }
        ],
        data: function () {
          return { dates: {} }
        }
      })

      stateMachine = new Machine({})
    })

    afterEach(() => {
      timekeeper.reset()
    })

    it('should have property onEnterState', () => {
      expect(stateMachineDates.observers).to.have.property('onEnterState')
    })

    it('should add state date if transition should not be skipped', () => {
      stateMachine.create()

      expect(stateMachine.dates).to.eql({
        created: now
      })
    })

    it('should not add state date if transition should be skipped', () => {
      stateMachine.goto('create')
      expect(stateMachine.dates).to.eql({})
    })

    it('should add multiple state dates if transitions should not be skipped', () => {
      stateMachine.create()
      stateMachine.place()

      expect(stateMachine.dates).to.eql({
        created: now,
        placed: now
      })
    })
  })
})
