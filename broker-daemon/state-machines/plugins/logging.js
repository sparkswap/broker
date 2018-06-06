const StateMachinePlugin = require('./abstract')

/**
 * @class Try transitions and reject those that fail
 */
class StateMachineLogging extends StateMachinePlugin {
  /**
   * Set up configuration for the logging plugin, controlling which properties on the host object to use
   * @param  {String} options.loggerName    Property of the host state machine that holds the logger
   * @return {StateMachineRejection}
   */
  constructor ({ loggerName = 'logger' } = {}) {
    super()
    this.loggerName = loggerName
  }

  /**
   * Observers object to add additional lifecycle observers
   * Used to add our `onBeforeReject` observer to add the error to the state machine property
   * @return {Object} Key value of observers
   */
  get observers () {
    const plugin = this

    return {
      onBeforeTransition: function (lifecycle) {
        this[plugin.loggerName].info(`BEFORE: ${lifecycle.transition}`)
      },
      onLeaveState: function (lifecycle) {
        this[plugin.loggerName].info(`LEAVE: ${lifecycle.from}`)
      },
      onEnterState: async function (lifecycle) {
        this[plugin.loggerName].info(`ENTER: ${lifecycle.to}`)
      },
      onAfterTransition: function (lifecycle) {
        this[plugin.loggerName].info(`AFTER: ${lifecycle.transition}`)
      },
      onTransition: function (lifecycle) {
        this[plugin.loggerName].info(`DURING: ${lifecycle.transition} (from ${lifecycle.from} to ${lifecycle.to})`)
      }
    }
  }
}

module.exports = StateMachineLogging
