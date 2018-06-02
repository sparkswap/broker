const StateMachinePlugin = require('./abstract')

/**
 * @class Try transitions and reject those that fail
 */
class StateMachineRejection extends StateMachinePlugin {

  constructor({ errorName = 'error' }) {
    this.errorName = errorName
  }

  configure (config) {
    super.configure(config)

    const plugin = this

    // plugin into StateMachinePersistence
    if(config.persistedFields) {
      /**
       * @type {StateMachinePersistence~FieldAccessor}
       * @param {String}   errorMessage Stored error message for a state machine in an errored state
       * @returns {String}              Error message for a state machine in an errored state
       */
      config.persistedFields.error = function (errorMessage) {
        if (errorMessage) {
          this[plugin.errorName] = new Error(errorMessage)
        }

        if (this[plugin.errorName]) {
          return this[plugin.errorName].message
        }
      }
    }
  }

  get transitions () {
    const plugin = this

    return [
      { name: 'reject', from: '*', to: 'rejected' }
    ]
  }

  get observers () {
    const plugin = this

    return {
      onBeforeReject: function (lifecycle, err) {
        this[plugin.errorName] = err
      }
    }
  }

  get methods () {
    const plugin = this

    return {
      /**
       * Wrapper for running the next transition with error handling
       * @param  {string}   transitionName Name of the transition to run
       * @param  {...Array} arguments      Arguments to the apply to the transition
       * @return {void}
       */
      tryTransition: function (transitionName, ...args) {
        try {
          if (!this.transitions().includes(transitionName)) {
            throw new Error(`${transitionName} is invalid transition from ${this.state}`)
          }

          await this[transitionName](...args)
        } catch (e) {
          this.reject(e)
        }
      }
    }
  }
}

module.exports = StateMachineRejection
