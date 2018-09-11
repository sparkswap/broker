const path = require('path')
const { expect, sinon, rewire } = require('test/test-helper')

const StateMachine = require('../state-machine')
const StateMachineRejection = rewire(path.resolve(__dirname, 'state-machine-events'))

describe('StateMachineRejection', () => {
  let Machine
  let machine
  let reject
  let step

  beforeEach(() => {
    Machine = StateMachine.factory({
      plugins: [
        new StateMachineRejection()
      ],
      transitions: [
        { name: 'step', from: 'none', to: 'first' }
      ]
    })
    machine = new Machine()
    reject = sinon.stub()
    machine.reject = reject
    step = sinon.stub()
    machine.step = step
  })
})
