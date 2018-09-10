const EventEmitter = require('events')

const StateMachinePlugin = require('./abstract')

/**
 * Events that should trigger the cleanup of all event handlers created
 * by the StateMachineEvents plugin
 *
 * @constant
 * @type {Array<String>}
 * @default
 */
const EXIT_EVENTS = Object.freeze(['cancel', 'complete', 'reject'])

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
        plugin.eventHandler.emit(lifecycle.transition, this.order.blockOrderId)

        // Remove all events from the event emitter if we have either cancelled,
        // completed, or rejected an order
        if (EXIT_EVENTS.includes(lifecycle.transition)) {
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
