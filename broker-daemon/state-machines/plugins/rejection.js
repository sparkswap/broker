const StateMachinePlugin = require('./abstract')

/**
 * @class Try transitions and reject those that fail
 */
class StateMachineRejection extends StateMachinePlugin {
  /**
   * Set up configuration for the rejection plugin, controlling which properties on the host object to use
   * @param {Object} [options={}]
   * @param {string} options.errorName    - Property of the host state machine to hold any errors that lead to rejectino
   * @param {string} options.rejectName   - Property of the host state machine for the method to move to rejected state
   * @param {string} options.rejectedName - Name of rejected state
   */
  constructor ({ errorName = 'error', rejectName = 'reject', rejectedName = 'rejected' } =
  { errorName: 'error', rejectName: 'reject', rejectedName: 'rejected' }) {
    super()
    this.errorName = errorName
    this.rejectName = rejectName
    this.rejectedName = rejectedName
  }

  /**
   * Transitions object to inject new transitions/states to the state machine
   * Use to add our custom `rejected` state to the state machine and its corresponding `reject` method
   * @returns {Array<Object>} New transitions to be added
   */
  get transitions () {
    const plugin = this

    return [
      { name: plugin.rejectName, from: '*', to: plugin.rejectedName }
    ]
  }

  /**
   * Observers object to add additional lifecycle observers
   * Used to add our `onBeforeReject` observer to add the error to the state machine property
   * @returns {Object} Key value of observers
   */
  get observers () {
    const plugin = this

    const capitalizedRejectName = `${plugin.rejectName.charAt(0).toUpperCase()}${plugin.rejectName.slice(1)}`

    return {
      [`onBefore${capitalizedRejectName}`]: function (_lifecycle, err) {
        this[plugin.errorName] = err
      }
    }
  }

  /**
   * Add a `tryTo` method to the state machine to use the plugin
   * @returns {Object} methods
   */
  get methods () {
    const plugin = this

    return {
      /**
       * Wrapper for running the next transition with error handling
       * @param  {string} transitionName - Name of the transition to run
       * @param  {...Array} args - Arguments to the apply to the transition
       * @returns {Promise<void>}
       */
      tryTo: async function (transitionName, ...args) {
        try {
          if (!this.transitions().includes(transitionName)) {
            throw new Error(`${transitionName} is invalid transition from ${this.state}`)
          }

          await this[transitionName](...args)
        } catch (e) {
          this[plugin.rejectName](e)
        }
        return undefined
      }
    }
  }
}

module.exports = StateMachineRejection
