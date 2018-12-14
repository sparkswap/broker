const { expect, sinon } = require('test/test-helper')

const StateMachineLogging = require('./logging')
const StateMachine = require('../state-machine')

describe('StateMachineLogging', () => {
  describe('observers', () => {
    let stateMachineLogging
    let Machine
    let stateMachine
    let logger
    let skipTransitions

    beforeEach(() => {
      skipTransitions = ['goto']
      stateMachineLogging = new StateMachineLogging({ skipTransitions })
      logger = { info: sinon.stub() }
      Machine = StateMachine.factory({
        plugins: [
          stateMachineLogging
        ],
        data: function ({ logger }) {
          return { logger }
        }
      })

      stateMachine = new Machine({ logger })
    })

    it('should have property onBeforeTransition', () => {
      expect(stateMachineLogging.observers).to.have.property('onBeforeTransition')
    })

    it('should log onBeforeTransition if transition should not be skipped', () => {
      const { onBeforeTransition } = stateMachineLogging.observers
      const lifecycle = { transition: 'start' }
      onBeforeTransition.call(stateMachine, lifecycle)
      expect(logger.info).to.have.been.calledWith(`BEFORE: ${lifecycle.transition}`)
    })

    it('should not log the onBeforeTransition if the transition should be skipped', () => {
      const { onBeforeTransition } = stateMachineLogging.observers
      const lifecycle = { transition: 'goto' }
      onBeforeTransition.call(stateMachine, lifecycle)
      expect(logger.info).to.not.have.been.called()
    })

    it('should have property onLeaveState', () => {
      expect(stateMachineLogging.observers).to.have.property('onLeaveState')
    })

    it('should log onLeaveState if transition should not be skipped', () => {
      const { onLeaveState } = stateMachineLogging.observers
      const lifecycle = { transition: 'start', from: 'something' }
      onLeaveState.call(stateMachine, lifecycle)
      expect(logger.info).to.have.been.calledWith(`LEAVE: ${lifecycle.from}`)
    })

    it('should not log the onLeaveState if the transition should be skipped', () => {
      const { onLeaveState } = stateMachineLogging.observers
      const lifecycle = { transition: 'goto' }
      onLeaveState.call(stateMachine, lifecycle)
      expect(logger.info).to.not.have.been.called()
    })

    it('should have property onEnterState', () => {
      expect(stateMachineLogging.observers).to.have.property('onEnterState')
    })

    it('should log onEnterState if transition should not be skipped', () => {
      const { onEnterState } = stateMachineLogging.observers
      const lifecycle = { transition: 'start', to: 'something' }
      onEnterState.call(stateMachine, lifecycle)
      expect(logger.info).to.have.been.calledWith(`ENTER: ${lifecycle.to}`)
    })

    it('should not log the onEnterState if the transition should be skipped', () => {
      const { onEnterState } = stateMachineLogging.observers
      const lifecycle = { transition: 'goto' }
      onEnterState.call(stateMachine, lifecycle)
      expect(logger.info).to.not.have.been.called()
    })

    it('should have property onAfterTransition', () => {
      expect(stateMachineLogging.observers).to.have.property('onAfterTransition')
    })

    it('should log onAfterTransition if transition should not be skipped', () => {
      const { onAfterTransition } = stateMachineLogging.observers
      const lifecycle = { transition: 'start', to: 'something' }
      onAfterTransition.call(stateMachine, lifecycle)
      expect(logger.info).to.have.been.calledWith(`AFTER: ${lifecycle.transition}`)
    })

    it('should not log the onAfterTransition if the transition should be skipped', () => {
      const { onAfterTransition } = stateMachineLogging.observers
      const lifecycle = { transition: 'goto' }
      onAfterTransition.call(stateMachine, lifecycle)
      expect(logger.info).to.not.have.been.called()
    })

    it('should have property onTransition', () => {
      expect(stateMachineLogging.observers).to.have.property('onTransition')
    })

    it('should log onTransition if transition should not be skipped', () => {
      const { onTransition } = stateMachineLogging.observers
      const lifecycle = { transition: 'start', to: 'something', from: 'somethingElse' }
      onTransition.call(stateMachine, lifecycle)
      expect(logger.info).to.have.been.calledWith(`DURING: ${lifecycle.transition} (from ${lifecycle.from} to ${lifecycle.to})`)
    })

    it('should not log the onTransition if the transition should be skipped', () => {
      const { onTransition } = stateMachineLogging.observers
      const lifecycle = { transition: 'goto' }
      onTransition.call(stateMachine, lifecycle)
      expect(logger.info).to.not.have.been.called()
    })
  })
})
