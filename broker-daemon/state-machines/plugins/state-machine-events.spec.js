const path = require('path')
const { expect, sinon, rewire } = require('test/test-helper')

const StateMachineEvents = rewire(path.resolve(__dirname, 'state-machine-events'))

describe('StateMachineEvents', () => {
  describe('constructor', () => {
    it('has an event handler', () => {
      const sme = new StateMachineEvents()
      expect(sme).to.have.property('eventHandler')
    })
  })

  describe('observers', () => {
    let emitStub
    let removeListenersStub
    let stateMachine
    let observers
    let eventEmitterStub

    beforeEach(() => {
      emitStub = sinon.stub()
      removeListenersStub = sinon.stub()
      eventEmitterStub = sinon.stub()
      eventEmitterStub.prototype.emit = emitStub
      eventEmitterStub.prototype.removeAllListeners = removeListenersStub

      StateMachineEvents.__set__('EventEmitter', eventEmitterStub)

      stateMachine = new StateMachineEvents()
    })

    beforeEach(() => {
      observers = stateMachine.observers
    })

    it('should have property onAfterTransition', () => {
      expect(observers).to.have.property('onAfterTransition')
    })

    it('should emit an event on each transition', () => {
      const lifecycle = { transition: 'start' }
      const { onAfterTransition } = observers
      onAfterTransition(lifecycle)
      expect(emitStub).to.have.been.calledWith(lifecycle.transition)
    })

    it('should have property onBeforeTransition', () => {
      expect(observers).to.have.property('onBeforeTransition')
    })

    it('should emit an event before each transition', () => {
      const lifecycle = { transition: 'start' }
      const { onBeforeTransition } = observers
      onBeforeTransition(lifecycle)
      expect(emitStub).to.have.been.calledWith(`before:${lifecycle.transition}`)
    })
  })

  describe('methods', () => {
    let onceStub
    let stateMachine
    let methods
    let eventEmitterStub
    let removeAllListenersStub

    beforeEach(() => {
      onceStub = sinon.stub()
      removeAllListenersStub = sinon.stub()
      eventEmitterStub = sinon.stub()
      eventEmitterStub.prototype.once = onceStub
      eventEmitterStub.prototype.removeAllListeners = removeAllListenersStub

      StateMachineEvents.__set__('EventEmitter', eventEmitterStub)

      stateMachine = new StateMachineEvents()
    })

    beforeEach(() => {
      methods = stateMachine.methods
    })

    it('should have property once', () => {
      expect(methods).to.have.property('once')
    })

    describe('#once', () => {
      it('should call an event emitters method', () => {
        const cb = sinon.stub()
        const type = 'cancel'
        const { once: stateMachineEventsOnce } = methods
        stateMachineEventsOnce(type, cb)
        expect(onceStub).to.have.been.calledWith(type, cb)
      })
    })

    describe('#removeAllListeners', () => {
      it('should call an event emitters method', () => {
        const { removeAllListeners: stateMachineEventsRemove } = methods
        stateMachineEventsRemove()
        expect(removeAllListenersStub).to.have.been.calledOnce()
      })
    })
  })
})
