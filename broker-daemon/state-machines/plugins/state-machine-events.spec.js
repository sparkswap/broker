const path = require('path')
const { expect, sinon, rewire } = require('test/test-helper')

const StateMachineEvents = rewire(path.resolve(__dirname, 'state-machine-events'))

describe('StateMachineEvents', () => {
  describe('constructor', () => {
    it('has an event handler', () => {
      const sme = new StateMachineEvents()
      expect(sme).to.have.property('eventHandler')
    })

    it('defines exit events', () => {
      const exitEvents = ['cancel']
      const sme = new StateMachineEvents({ exitEvents })
      expect(sme).to.have.property('exitEvents')
      expect(sme.exitEvents).to.be.eql(exitEvents)
    })

    it('defaults exit events to an empty array', () => {
      const sme = new StateMachineEvents()
      expect(sme).to.have.property('exitEvents')
      expect(sme.exitEvents).to.be.eql([])
    })
  })

  describe('observers', () => {
    let emitStub
    let exitEvents
    let removeListenersStub
    let stateMachine
    let observers
    let eventEmitterStub

    beforeEach(() => {
      emitStub = sinon.stub()
      exitEvents = ['cancel']
      removeListenersStub = sinon.stub()
      eventEmitterStub = sinon.stub()
      eventEmitterStub.prototype.emit = emitStub
      eventEmitterStub.prototype.removeAllListeners = removeListenersStub

      StateMachineEvents.__set__('EventEmitter', eventEmitterStub)

      stateMachine = new StateMachineEvents({ exitEvents })
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

    it('should remove all listeners if an event is listed as an exit event', () => {
      const lifecycle = { transition: 'cancel' }
      const { onAfterTransition } = observers
      onAfterTransition(lifecycle)
      expect(emitStub).to.have.been.calledWith(lifecycle.transition)
      expect(removeListenersStub).to.have.been.calledOnce()
    })
  })

  describe('methods', () => {
    let onceStub
    let stateMachine
    let methods
    let eventEmitterStub

    beforeEach(() => {
      onceStub = sinon.stub()
      eventEmitterStub = sinon.stub()
      eventEmitterStub.prototype.once = onceStub

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
  })
})
