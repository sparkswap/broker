const StateMachinePlugin = require('./abstract')

/**
 * @class Try transitions and reject those that fail
 */
class StateMachineRejection extends StateMachinePlugin {
  constructor ({ errorName = 'error', rejectName = 'reject', rejectedName = 'rejected' } = {}) {
    super()
    this.errorName = errorName
    this.rejectName = rejectName
    this.rejectedName = rejectedName
  }

  get transitions () {
    const plugin = this

    return [
      { name: plugin.rejectName, from: '*', to: plugin.rejectedName }
    ]
  }

  get observers () {
    const plugin = this

    const capitalizedRejectName = `${plugin.rejectName.charAt(0).toUpperCase()}${plugin.rejectName.slice(1)}`

    return {
      [`onBefore${capitalizedRejectName}`]: function (lifecycle, err) {
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
      tryTransition: async function (transitionName, ...args) {
        try {
          if (!this.transitions().includes(transitionName)) {
            throw new Error(`${transitionName} is invalid transition from ${this.state}`)
          }

          await this[transitionName](...args)
        } catch (e) {
          this[plugin.rejectName](e)
        }
      }
    }
  }
}

module.exports = StateMachineRejection
