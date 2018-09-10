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

  get transitions () {
    return [{
      name: 'events',
      from: '*',
      to: (s) => {
        console.log('whats up')
        console.log(s)
      }
    }]
  }
}

module.exports = StateMachineEvents
