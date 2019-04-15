const { expect, timekeeper } = require('test/test-helper')

const StateMachineDates = require('./state-machine-dates')
const StateMachine = require('../state-machine')

describe('StateMachineLogging', () => {
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

    it('should log onEnterState if transition should not be skipped', () => {
      stateMachine.create()

      expect(stateMachine.dates).to.eql({
        dateCreated: now
      })
    })

    it('should not log the onEnterState if the transition should be skipped', () => {
      stateMachine.goto('create')
      expect(stateMachine.dates).to.eql({})
    })

    it('should add multiple dates if it goes through multiple transitions', () => {
      stateMachine.create()
      stateMachine.place()

      expect(stateMachine.dates).to.eql({
        dateCreated: now,
        datePlaced: now
      })
    })
  })
})
