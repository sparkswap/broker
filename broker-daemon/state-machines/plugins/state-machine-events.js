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
  constructor () {
    super()

    this.eventHandler = new EventEmitter()
  }

  /**
   * Adds event emition observer to all transition calls to allow for event passing
   * to external workers (BlockOrderWorker)
   */
  get observers () {
    const plugin = this

    return {
      /**
       * Emit an event before a transition (prefixed by 'before:')
       * e.g. stateMachine.on('before:create')
       * @param  {Object} lifecycle
       * @return {void}
       */
      onBeforeTransition: function (lifecycle) {
        plugin.eventHandler.emit(`before:${lifecycle.transition}`)
      },
      /**
       * Emit an event after a transition
       * (no prefix to use the same shorthand as javascript-state-machine)
       * @param {Object} lifecycle
       * @returns {void}
       */
      onAfterTransition: function (lifecycle) {
        plugin.eventHandler.emit(lifecycle.transition)
      }
    }
  }

  /**
   * Alias methods on a StateMachine for event handling
   */
  get methods () {
    const { eventHandler } = this

    return {
      once: (type, cb) => eventHandler.once(type, cb),
      removeAllListeners: () => eventHandler.removeAllListeners()
    }
  }
}

module.exports = StateMachineEvents
