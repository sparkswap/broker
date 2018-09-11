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
  constructor ({ exitEvents = [] } = {}) {
    super()

    this.eventHandler = new EventEmitter()
    this.exitEvents = exitEvents
  }

  /**
   * Adds an event emition observer to all transition calls to allow for event passing
   * to external workers (BlockOrderWorker)
   */
  get observers () {
    const plugin = this

    return {
      /**
       * @param {Object} lifecycle
       * @returns {void}
       */
      onAfterTransition: function (lifecycle) {
        plugin.eventHandler.emit(lifecycle.transition)

        // Remove all events from the event emitter if we have either cancelled,
        // completed, or rejected an order
        if (plugin.exitEvents.includes(lifecycle.transition)) {
          plugin.eventHandler.removeAllListeners()
        }
      }
    }
  }

  /**
   * Alias methods on a StateMachine for event handling
   */
  get methods () {
    const { eventHandler } = this

    return {
      once: (type, cb) => eventHandler.once(type, cb)
    }
  }
}

module.exports = StateMachineEvents
