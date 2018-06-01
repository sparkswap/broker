const StateMachine = require('javascript-state-machine')

/**
 * Allow for static methods to be plugged into State Machine factories
 * If a plugin exposes a `staticMethods` property after configuration,
 * that property will be assigned to the State Machine Factory
 *
 * e.g.
 * const plugin = {
 *   staticMethods: {
 *     myStatic: function (hello) {
 *       console.log(hello +  " world")
 *     }
 *   }
 * }
 *
 * const MyFactory = StateMachine.factory({
 *   plugins: [
 *     plugin
 *   ],
 *   ...
 * })
 *
 * MyFactory.myStatic("hello")
 * // logs: "hello world"
 */

StateMachine._factory = StateMachine.factory
StateMachine.factory = function () {
  const cstor = this._factory.apply(this, [].slice.apply(arguments))
  const config = cstor.prototype._fsm.config

  config.plugins.forEach((plugin) => {
    Object.assign(cstor, plugin.staticMethods || {})
  })
}

module.exports = StateMachine