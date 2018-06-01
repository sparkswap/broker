const { promisify } = require('util')
const { getRecords } = require('../../utils')
const StateMachinePlugin = require('./abstract')

/**
 * @class Store state machine data and state using a LevelUp compatible store
 */
class StateMachinePersistence extends StateMachinePlugin {
  /**
   * @class A store compatible with the StateMachinePersistence plugin
   * @name StateMachinePersistence~Store
   *
   * @method StateMachinePersistence~Store#put
   * @param   {String}                                    key   Unique key under which to store the data
   * @param   {String}                                    value String representing data to be stored
   * @param   {StateMachinePersistence~Store~putCallback} callback
   * @returns {void}
   *
   * Callback when Store#put is complete
   * @callback StateMachinePersistence~Store~putCallback
   * @param {Error} err Error encountered if any
   *
   * @method StateMachinePersistence~Store#get
   * @param   {String}                                    key      Unique key under which the data is stored
   * @param   {StateMachinePersistence~Store~getCallback} callback
   * @returns {void}
   *
   * Callback when Store#get is complete
   * @callback StateMachinePersistence~Store~getCallback
   * @param {Error}  err   Error encountered if any
   * @param {String} value Stored data
   *
   * @method StateMachinePersistence~Store#createReadStream
   * @param   {Object}         options options for the read stream
   * @returns {ReadableStream}         Readable stream of entries in the store
   */

  /**
   * Set up the persistence plugin with user-defined attributes to save additional fielsd and avoid naming conflicts
   * @param  {String|Function}          options.key              Name of the property on the state machine instance with the unique key, or a function that derives the key from the instance
   * @param  {Array}                    options.additionalFields List of additional properties on the instance to be persisted
   * @param  {String}                   options.storeName        Name of the property on the state machine where the StateMachinePersistence~Store is located
   * @return {StateMachinePersistence}                           Plugin-compatible class
   */
  constructor ({ key = 'id', additionalFields = {}, storeName = 'store' } = {}) {
    super()
    this.key = key
    this.additionalFields = additionalFields
    this.storeName = storeName
  }

  /**
   * Add the `goto` transition used during re-inflation of state machines
   * @param  {StateMachine~Config} config State machine configuration object
   * @return {void}
   */
  configure (config) {
    super.configure(config)
    config.mapTransition(
      { name: 'goto', from: '*', to: (s) => s }
    )
  }

  /**
   * Check that the instance has a valid StateMachinePersistence~Store
   * @param  {Object} instance State machine instance being initialized
   * @param  {StateMachinePersistence~Store} instance.store Compatible store
   * @return {void}
   */
  init (instance) {
    super.init(instance)

    if (!instance[this.storeName] || typeof instance[this.storeName].put !== 'function') {
      throw new Error(`A store must be present on the state machine at ${this.storeName} in order to use the persistence plugin`)
    }
  }

  /**
   * Properties of the state machine that are persisted
   * @return {Object} Object of property names to persist with a setter and getter
   */
  get persistedFields () {
    const fields = {
      state: function (state) {
        if (state) {
          this.goto(state)
        } else {
          return this.state
        }
      }
    }

    return Object.assign(fields, this.additionalFields)
  }

  /**
   * Our custom lifecycle observers to be added to every instance
   * @return {Object} Key value of lifecycle events and functions to be called during them
   */
  get observers () {
    const plugin = this

    return {
    /**
     * Trigger our custom persist method any time we enter a state (unless re-inflating or merely instantiating)
     * @param  {Object}        instance  State machine instance undergoing the event
     * @param  {Object}        lifecycle State machine lifecycle object
     * @return {Promise<void>}           Promise that resolves when persist resolves, allowing the transition to continue
     */
      onEnterState: async function (lifecycle) {
        if (lifecycle.transition !== 'goto' && lifecycle.to !== 'none') {
          let key

          if (typeof plugin.key === 'function') {
            key = plugin.key.call(this)
          } else {
            key = this[plugin.key]
          }

          return this.persist(key)
        }
      }
    }
  }

  /**
   * State machine plugins define `methods` to be mixed into the state machine prototype
   * @return {Object} Object of all methods to be mixed in
   */
  get methods () {
    const plugin = this

    return {
      /**
       * Save the current state of the state machine to the store
       * @param  {String}        key    Unique key that the host can be saved using
       * @return {Promise<void>}        Promise that resolves when the state is persisted
       */
      persist: async function (key) {
        if (!key) {
          throw new Error(`An key is required to save state`)
        }

        const fields = plugin.persistedFields || {}

        const data = {}

        Object.entries(fields).forEach(([ name, getter ]) => {
          data[name] = getter.call(this)
        })

        plugin.hook(this, 'persist', [key, data])

        // somehow spit an error if this fails?
        await promisify(this[plugin.storeName].put)(key, JSON.stringify(data))
      }
    }
  }

  /**
   * State machine doesn't support adding static methods, but this getter defines them so we can apply them manually
   * @return {Object} Object of all static methods to be mixed in
   */
  get staticMethods () {
    const plugin = this

    return {
      /**
       * Re-hydrate an OrderStateMachine from storage
       * @param  {Object} initParams    Params to pass to the state machine constructor (also to the `data` function)
       * @param  {String} options.key   Stored key
       * @param  {String} options.value Plain object of the Order State Machine object
       * @return {OrderStateMachine}
       */
      fromStore: function (initParams, { key, value }) {
        const fields = plugin.persistedFields || {}
        const parsedValue = JSON.parse(value)

        const instance = new this(initParams)

        // set the key
        if (typeof plugin.key === 'function') {
          plugin.key.call(instance, key, parsedValue)
        } else {
          instance[plugin.key] = key
        }

        // set the other fields
        Object.entries(fields).forEach(([ name, setter ]) => {
          setter.call(instance, parsedValue[name], key, parsedValue)
        })

        plugin.hook(instance, 'inflate', [key, parsedValue])

        return instance
      },

      /**
       * Retrieve a single state machine from a given store
       * @param  {String}                        key                Unique key for the state machine in the store
       * @param  {StateMachinePersistence~Store} options[storeName] Store in which the state machine is located
       * @param  {...Object}                     initParams         Other parameters to initialize the state machines with
       * @return {Promise<StateMachine>}                            Re-inflated state machine
       */
      get: async function (key, initParams) {
        const store = initParams[plugin.storeName]

        if (!store || typeof store.get !== 'function') {
          throw new Error(`A store must be present at ${plugin.storeName} in order to use the persistence plugin`)
        }

        const value = await promisify(store.get)(key)

        return this.fromStore(initParams, { key, value })
      },

      /**
       * Retrieve and instantiate all state machines from a given store
       * @param  {StateMachinePersistence~Store} options[storeName] Store that contains the saved state machines
       * @param  {...Object}                     initParams         Other parameters to initialize the state machines with
       * @return {Promise<Array<StateMachine>>}
       */
      getAll: async function (initParams) {
        const store = initParams[plugin.storeName]

        if (!store || typeof store.createReadStream !== 'function') {
          throw new Error(`A store must be present at ${plugin.storeName} in order to use the persistence plugin`)
        }

        return getRecords(store, (key, value) => this.fromStore(initParams, { key, value }))
      }

    }
  }
}

module.exports = StateMachinePersistence
