const StateMachinePlugin = require('./abstract')

/**
 * @class Try transitions and reject those that fail
 */
class StateMachineRejection extends StateMachinePlugin {

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
        this.error = err
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
