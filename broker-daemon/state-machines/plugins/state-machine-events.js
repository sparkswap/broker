const EventEmitter = require('events')

const StateMachinePlugin = require('./abstract')

/**
 * @class Add event emittion to a state machine
 */
class StateMachineEvents extends StateMachinePlugin {
  /**
   * Setup for configuration of StateMachineEvents plugin
   * @param {object} instance - State machine instance being initialized
   */
  init (instance) {
    super.init(instance)
    instance.eventHandler = new EventEmitter()
  }

  /**
   * Adds event emition observer to all transition calls to allow for event passing
   * to external workers (BlockOrderWorker)
   * @returns {object} observers
   */
  get observers () {
    return {
      /**
       * Emit an event before a transition (prefixed by 'before:')
       * e.g. stateMachine.on('before:create')
       * @param  {object} lifecycle
       * @returns {void}
       */
      onBeforeTransition: function (lifecycle) {
        const stateMachineInstance = this
        stateMachineInstance.eventHandler.emit(`before:${lifecycle.transition}`)
      },
      /**
       * Emit an event after a transition
       * (no prefix to use the same shorthand as javascript-state-machine)
       * @param {object} lifecycle
       * @returns {void}
       */
      onAfterTransition: function (lifecycle) {
        const stateMachineInstance = this
        stateMachineInstance.eventHandler.emit(lifecycle.transition)
      }
    }
  }

  /**
   * Alias methods on a StateMachine for event handling
   * @returns {object} methods
   */
  get methods () {
    return {
      once: function (type, cb) {
        const stateMachineInstance = this
        stateMachineInstance.eventHandler.once(type, cb)
      },
      removeAllListeners: function () {
        const stateMachineInstance = this
        stateMachineInstance.eventHandler.removeAllListeners()
      }
    }
  }
}

module.exports = StateMachineEvents
