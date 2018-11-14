const EventEmitter = require('events')

const StateMachinePlugin = require('./abstract')

/**
 * @class Add event emittion to a state machine
 */
class StateMachineEvents extends StateMachinePlugin {
  /**
   * Setup for configuration of StateMachineEvents plugin
   * @returns {StateMachineEvents}
   */

  /**
   * Check that the instance has a valid StateMachinePersistence~Store
   * @param  {Object} instance State machine instance being initialized
   * @param  {StateMachinePersistence~Store} instance.store Compatible store
   * @return {void}
   */
  init (instance) {
    super.init(instance)
    instance.eventHandler = new EventEmitter()
  }

  /**
   * Adds event emition observer to all transition calls to allow for event passing
   * to external workers (BlockOrderWorker)
   */
  get observers () {
    return {
      /**
       * Emit an event before a transition (prefixed by 'before:')
       * e.g. stateMachine.on('before:create')
       * @param  {Object} lifecycle
       * @return {void}
       */
      onBeforeTransition: function (lifecycle) {
        this.eventHandler.emit(`before:${lifecycle.transition}`)
      },
      /**
       * Emit an event after a transition
       * (no prefix to use the same shorthand as javascript-state-machine)
       * @param {Object} lifecycle
       * @returns {void}
       */
      onAfterTransition: function (lifecycle) {
        this.eventHandler.emit(lifecycle.transition)
      }
    }
  }

  /**
   * Alias methods on a StateMachine for event handling
   */
  get methods () {
    return {
      once: function (type, cb) {
        this.eventHandler.once(type, cb)
      },
      removeAllListeners: function () {
        this.eventHandler.removeAllListeners()
      }
    }
  }
}

module.exports = StateMachineEvents
