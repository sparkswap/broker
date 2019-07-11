/**
 * @class Abstract class for creating StateMachine Plugins
 */
class StateMachineAbstractPlugin {
  /**
   * State machine plugins are constructed before they are added to the state machine
   * Used for plugin-wide configuration.
   */
  constructor () {} // eslint-disable-line

  /**
   * A copy of StateMachinePlugin, which is not exposed
   * @param  {object}       instance       - State machine instance to be hooked
   * @param  {string}       event          - Name of the event (e.g. `persist`)
   * @param  {Array}        additionalArgs - Additional arguments to be applied to the hooked functions
   * @returns {void}
   */
  hook (instance, event, additionalArgs = []) {
    const fsm = instance._fsm
    const { plugins } = fsm.config
    const args = [ fsm.context ].concat(additionalArgs)

    plugins.forEach((plugin) => {
      if (plugin[event]) {
        plugin[event].apply(plugin, args)
      }
    })
  }

  /**
   * State machine plugins expose a `configure` method that gets called against the config object when building the factory
   * By default, we use it to apply our custom transitions
   * @see https://github.com/jakesgordon/javascript-state-machine/blob/master/src/config.js#L119
   * @param {object} config - State machine configuration object
   * @returns {void}
   */
  configure (config) {
    this.transitions.forEach((transition) => {
      config.mapTransition(transition)
    })
  }

  /**
   * State machine provides a hook when a new state machine is init'ed
   * By default, we use it to apply our custom lifecycle observers (the `lifecycle` hook provided by JSM does not support promises)
   * @see https://github.com/jakesgordon/javascript-state-machine/blob/master/src/jsm.js#L22
   * @param {object} instance - State machine instance being initialized
   * @returns {void}
   */
  init (instance) {
    Object.entries(this.observers).forEach(([ name, func ]) => {
      // need to bind `func` to the state machine instance, otherwise it gets called in a useless context
      // The only way to get it bound to the state machine normally would be to override the function name
      // on the instance itself
      instance.observe(name, func.bind(instance))
    })
  }

  /**
   * Our custom transitions to be added to the factory
   * @returns {Array} Array of JSM-compatible transitions
   */
  get transitions () {
    return []
  }

  /**
   * Our custom lifecycle observers to be added to every instance
   * @returns {object} Key value of lifecycle events and functions to be called during them
   */
  get observers () {
    return {}
  }

  /**
   * State machine plugins define `methods` to be mixed into the state machine prototype
   * @returns {object} Object of all methods to be mixed in
   */
  get methods () {
    return {}
  }

  /**
   * State machine plugins define `properties` to be mixed into the state machine instance
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperties
   * @returns {object} Property definitions that can be used with `Object.defineProperties`
   */
  get properties () {
    return {}
  }

  /**
   * Upstream state machine doesn't support plugins adding static methods,
   * but ../state-machine modifies to use the `staticMethods` property
   * @returns {object} Object of all static methods to be mixed in
   */
  get staticMethods () {
    return {}
  }
}

module.exports = StateMachineAbstractPlugin
