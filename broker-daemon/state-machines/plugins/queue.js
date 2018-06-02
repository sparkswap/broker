const StateMachinePlugin = require('./abstract')

/**
 * @class Try transitions and reject those that fail
 */
class StateMachineQueue extends StateMachinePlugin {

  constructor({ queueName = 'queue' }) {
    this.queueName = queueName
  }

  get observers () {
    const plugin = this

    return {
      onAfterTransition: function (lifecycle) {
        if(this[plugin.queueName].length) {
          const next = this[plugin.queueName].pop()

          // you can't start a transition while in another one,
          // so we `nextTick` our way out of the current transition
          // @see {@link https://github.com/jakesgordon/javascript-state-machine/issues/143}
          process.nextTick(() => {
            this[next.name].apply(this, next.args)
          })
        }
      }
    }
  }

  get methods () {
    const plugin = this

    return {
      queueTransition: function (transitionName, ...args) {
        if(this[plugin.queueName].length) {
          throw new Error(`Cannot queue ${transitionName}, ${this[plugin.queueName][0].name} is already queued.`)
        }

        this[plugin.queueName].push({ name: transitionName, args: args })
      }
    }
  }

  get properties () {
    const plugin = this

    return {
      [plugin.queueName]: {
        enumerable: true,
        value: []
      }
    }
  }
}

module.exports = StateMachineQueue
