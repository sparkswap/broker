const path = require('path')
const { expect, sinon, rewire } = require('test/test-helper')

const StateMachineEvents = rewire(path.resolve(__dirname, 'state-machine-events'))
const StateMachine = require('../state-machine')

describe('StateMachineEvents', () => {
  describe('init', () => {
    let stateMachine
    let Machine

    before(() => {
      Machine = StateMachine.factory({
        plugins: [
          new StateMachineEvents()
        ]
      })

      stateMachine = new Machine()
    })

    it('should set an eventHandler on the instance of the state machine', () => {
      expect(stateMachine).to.have.property('eventHandler')
    })
  })

  describe('observers', () => {
    let emitStub
    let removeListenersStub
    let eventEmitterStub
    let stateMachineEvents
    let Machine
    let stateMachine

    beforeEach(() => {
      emitStub = sinon.stub()
      removeListenersStub = sinon.stub()
      eventEmitterStub = sinon.stub()
      eventEmitterStub.prototype.emit = emitStub
      eventEmitterStub.prototype.removeAllListeners = removeListenersStub

      StateMachineEvents.__set__('EventEmitter', eventEmitterStub)
      stateMachineEvents = new StateMachineEvents()
      Machine = StateMachine.factory()
      stateMachine = new Machine()
      stateMachineEvents.init(stateMachine)
    })

    it('should have property onAfterTransition', () => {
      expect(stateMachineEvents.observers).to.have.property('onAfterTransition')
    })

    it('should emit an event on each transition', () => {
      const lifecycle = { transition: 'start' }
      const { onAfterTransition } = stateMachineEvents.observers
      onAfterTransition.call(stateMachine, lifecycle)
      expect(emitStub).to.have.been.calledWith(lifecycle.transition)
    })

    it('should have property onBeforeTransition', () => {
      expect(stateMachineEvents.observers).to.have.property('onBeforeTransition')
    })

    it('should emit an event before each transition', () => {
      const lifecycle = { transition: 'start' }
      const { onBeforeTransition } = stateMachineEvents.observers
      onBeforeTransition.call(stateMachine, lifecycle)
      expect(emitStub).to.have.been.calledWith(`before:${lifecycle.transition}`)
    })
  })

  describe('methods', () => {
    let onceStub
    let stateMachine
    let methods
    let eventEmitterStub
    let removeAllListenersStub
    let stateMachineEvents
    let Machine

    beforeEach(() => {
      onceStub = sinon.stub()
      removeAllListenersStub = sinon.stub()
      eventEmitterStub = sinon.stub()
      eventEmitterStub.prototype.once = onceStub
      eventEmitterStub.prototype.removeAllListeners = removeAllListenersStub

      StateMachineEvents.__set__('EventEmitter', eventEmitterStub)

      stateMachineEvents = new StateMachineEvents()
      Machine = StateMachine.factory()
      stateMachine = new Machine()
      stateMachineEvents.init(stateMachine)
      methods = stateMachineEvents.methods
    })

    it('should have property once', () => {
      expect(methods).to.have.property('once')
    })

    describe('#once', () => {
      it('should call an event emitters method', () => {
        const cb = sinon.stub()
        const type = 'cancel'
        const { once: stateMachineEventsOnce } = methods
        stateMachineEventsOnce.call(stateMachine, type, cb)
        expect(onceStub).to.have.been.calledWith(type, cb)
      })
    })

    describe('#removeAllListeners', () => {
      it('should call an event emitters method', () => {
        const { removeAllListeners: stateMachineEventsRemove } = methods
        stateMachineEventsRemove.call(stateMachine)
        expect(removeAllListenersStub).to.have.been.calledOnce()
      })
    })
  })
})
