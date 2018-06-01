const pluginUtil = require('javascript-state-machine/lib/plugin')

/**
 * @class Abstract class for creating StateMachine Plugins
 */
class StateMachineAbstractPlugin {  
  /**
   * State machine plugins are constructed before they are added to the state machine
   * Used for plugin-wide configuration.
   */
  constructor() {
  }

  /**
   * Convenence method for hooking other plugins using StateMachine~plugin
   * @param  {StateMachine} instance       State machine instance to be hooked
   * @param  {String}       event          Name of the event (e.g. `persist`)
   * @param  {Array}        additionalArgs Additional arguments to be applied to the hooked functions
   * @return {void}
   */
  hook(instance, event, additionalArgs = []) {
    pluginUtil.hook(instance, event, additionalArgs)
  }

  /**
   * State machine plugins expose a `configure` method that gets called against the config object when building the factory
   * @see {@link https://github.com/jakesgordon/javascript-state-machine/blob/master/src/config.js#L119}
   * @param  {StateMachine~Config} config State machine configuration object
   * @return {void}
   */
  configure(config) {
  }

  /**
   * State machine provides a hook when a new state machine is init'ed
   * By default, we use it to apply our custom lifecycle observers (the lifecycle hook does not support promises)
   * @see {@link https://github.com/jakesgordon/javascript-state-machine/blob/master/src/jsm.js#L22}
   * @param  {Object} instance State machine instance being initialized
   * @return {void}
   */
  init(instance) {
    Object.entries(this.observers).forEach(([ name, func]) => {
      instance.observe(name, func)
    })
  }

  /**
   * Our custom lifecycle observers to be added to every instance
   * @return {Object} Key value of lifecycle events and functions to be called during them
   */
  get observers () {
    const plugin = this

    return {}
  }

  /**
   * State machine plugins define `methods` to be mixed into the state machine prototype
   * @return {Object} Object of all methods to be mixed in
   */
  get methods () {
    const plugin = this

    return {}
  }

  /**
   * Upstream state machine doesn't support plugins adding static methods,
   * but ../state-machine modifies to use the `staticMethods` property
   * @return {Object} Object of all static methods to be mixed in
   */
  get staticMethods () {
    const plugin = this

    return {}
  }
}

module.exports = StateMachineAbstractPlugin
