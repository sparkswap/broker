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
  constructor ({ loggerName = 'logger', skipTransitions = [] } = {}) {
    super()
    this.loggerName = loggerName
    this.skipTransitions = skipTransitions
  }

  /**
   * Observers object to add additional lifecycle observers
   * Adds our lifecycle observers to call the logging function
   * @return {Object} Key value of observers
   */
  get observers () {
    const plugin = this

    return {
      onBeforeTransition: function (lifecycle) {
        if (!plugin.skipTransitions.includes(lifecycle.transition)) {
          this[plugin.loggerName].info(`BEFORE: ${lifecycle.transition}`)
        }
      },
      onLeaveState: function (lifecycle) {
        if (!plugin.skipTransitions.includes(lifecycle.transition)) {
          this[plugin.loggerName].info(`LEAVE: ${lifecycle.from}`)
        }
      },
      onEnterState: async function (lifecycle) {
        if (!plugin.skipTransitions.includes(lifecycle.transition)) {
          this[plugin.loggerName].info(`ENTER: ${lifecycle.to}`)
        }
      },
      onAfterTransition: function (lifecycle) {
        if (!plugin.skipTransitions.includes(lifecycle.transition)) {
          this[plugin.loggerName].info(`AFTER: ${lifecycle.transition}`)
        }
      },
      onTransition: function (lifecycle) {
        if (!plugin.skipTransitions.includes(lifecycle.transition)) {
          this[plugin.loggerName].info(`DURING: ${lifecycle.transition} (from ${lifecycle.from} to ${lifecycle.to})`)
        }
      }
    }
  }
}

module.exports = StateMachineLogging
