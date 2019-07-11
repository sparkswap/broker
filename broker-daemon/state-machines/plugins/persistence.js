const { promisify } = require('util')
const StateMachinePlugin = require('./abstract')

/* // JSDoc disabled due to Typescript errors
 * @class A store compatible with the StateMachinePersistence plugin
 * @name StateMachinePersistenceStore
 *
 * @method StateMachinePersistenceStore#put
 * @param   {String}                                    key   Unique key under which to store the data
 * @param   {String}                                    value String representing data to be stored
 * @param   {StateMachinePersistenceStorePutCallback} callback
 * @returns {void}
 *
 * Callback when Store#put is complete
 * @callback StateMachinePersistenceStorePutCallback
 * @param {Error} err Error encountered if any
 *
 * @method StateMachinePersistenceStore#get
 * @param   {String}                                    key      Unique key under which the data is stored
 * @param   {StateMachinePersistenceStoreGetCallback} callback
 * @returns {void}
 *
 * Callback when Store#get is complete
 * @callback StateMachinePersistenceStoreGetCallback
 * @param {Error}  err   Error encountered if any
 * @param {String} value Stored data
 *
 * @method StateMachinePersistenceStore#createReadStream
 * @param   {Object}         options options for the read stream
 * @returns {ReadableStream}         Readable stream of entries in the store
 */

/**
 * Field accessor for saving and inflating state machines
 * @typedef {Function} StateMachinePersistenceFieldAccessor
 * @param {*}      val   Value to be set. Will be undefined if the accessor is being used as a getter.
 * @param {String} key   Key being used to inflate the state machine for which this accessor is being set. Will be undefined if being used as a getter.
 * @param {Object} value Object being used to inflate the state machine for which this accessor is being set. Will be undefined if being used as a getter.
 */

/**
 * Unique key accessor for saving and inflating state machines
 * @typedef {(Function|String)} StateMachinePersistenceKeyAccessor
 *     If a string is passed, the accessor will act as an accessor on property specified by the string.
 * @param {String}      key   Key being used to inflate the state machine for which this accessor is being set. Will be undefined if being used as a getter.
 * @param {Object}      value Object being used to inflate the state machine for which this accessor is being set. Will be undefined if being used as a getter.
 */

/**
 * @class Store state machine data and state using a LevelUp compatible store
 */
class StateMachinePersistence extends StateMachinePlugin {
  /**
   * Set up the persistence plugin with user-defined attributes to save additional fields and avoid naming conflicts
   * @param {Object} options
   * @param {StateMachinePersistenceKeyAccessor} options.key - Name of the property on the state machine instance with the unique key, or a function that derives the key from the instance
   * @param {Object<string, StateMachinePersistenceFieldAccessor>} options.additionalFields - List of additional properties on the instance to be persisted
   * @param {string} [options.storeName] - Name of the property on the state machine where the StateMachinePersistenceStore is located
   */
  constructor ({ key = 'id', additionalFields = {}, storeName = 'store' } =
  { key: 'id', additionalFields: {}, storeName: 'store' }) {
    super()
    this.key = key
    this.additionalFields = additionalFields
    this.storeName = storeName
  }

  /**
   * Check that the instance has a valid StateMachinePersistenceStore
   * @param  {Object} instance - State machine instance being initialized
   * @param  {Object} instance.store - Compatible store
   * @returns {void}
   */
  init (instance) {
    super.init(instance)

    if (!instance[this.storeName] || typeof instance[this.storeName].put !== 'function') {
      throw new Error(`A store must be present on the state machine at ${this.storeName} in order to use the persistence plugin`)
    }
  }

  /**
   * Properties of the state machine that are persisted
   * @returns {Object} Object of property names to persist with a setter and getter
   */
  get persistedFields () {
    const fields = {
      state: function (state) {
        if (state) {
          this.goto(state)
        }
        return this.state
      }
    }

    return Object.assign(fields, this.additionalFields)
  }

  /**
   * Custom transitions that get applied during configuration
   * @returns {Array<Object>} List of JSM compatible transitions
   */
  get transitions () {
    return [
      // `goto` transition used during re-inflation of state machines
      { name: 'goto', from: '*', to: (s) => s }
    ]
  }

  /**
   * Our custom lifecycle observers to be added to every instance
   * @returns {Object} Key value of lifecycle events and functions to be called during them
   */
  get observers () {
    const plugin = this

    return {
      /**
       * Trigger our custom persist method any time we enter a state (unless re-inflating or merely instantiating)
       * @param {Object} lifecycle - State machine lifecycle object
       * @returns {Promise<void>} Promise that resolves when persist resolves, allowing the transition to continue
       */
      onEnterState: async function (lifecycle) {
        if (lifecycle.transition !== 'goto') {
          let key

          if (typeof plugin.key === 'function') {
            // @ts-ignore
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
   * @returns {Object} Object of all methods to be mixed in
   */
  get methods () {
    const plugin = this

    return {
      /**
       * Save the current state of the state machine to the store
       * @param {string} key - Unique key that the host can be saved using
       * @returns {Promise<void>} Promise that resolves when the state is persisted
       */
      persist: async function (key) {
        if (!key) {
          throw new Error(`A key is required to save state`)
        }

        const fields = plugin.persistedFields || {}

        const data = {}

        Object.entries(fields).forEach(([ name, getter ]) => {
          data[name] = getter.call(this)
        })

        plugin.hook(this, 'persist', [key, data])

        // somehow spit an error if this fails?
        await promisify(this[plugin.storeName].put)(key, JSON.stringify(data))
        return undefined
      }
    }
  }

  /**
   * State machine doesn't support adding static methods, but this getter defines them so we can apply them manually
   * @returns {Object} Object of all static methods to be mixed in
   */
  get staticMethods () {
    const plugin = this

    return {
      /**
       * Re-hydrate an OrderStateMachine from storage
       * @param  {Object} initParams    - Params to pass to the state machine constructor (also to the `data` function)
       * @param  {Object} options
       * @param  {string} options.key   - Stored key
       * @param  {string} options.value - Plain object of the Order State Machine object
       * @returns {Object} - OrderStateMachine
       */
      fromStore: function (initParams, { key, value }) {
        const fields = plugin.persistedFields || {}
        const parsedValue = JSON.parse(value)

        const instance = new this(initParams)

        // set the key
        if (typeof plugin.key === 'function') {
          // @ts-ignore
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
       * @param {string}                        key                - Unique key for the state machine in the store
       * @param {...Object}                     initParams         - Other parameters to initialize the state machines with
       * @returns {Promise<Object>}                            Re-inflated state machine
       */
      get: async function (key, initParams) {
        const store = initParams[plugin.storeName]

        if (!store || typeof store.get !== 'function') {
          throw new Error(`A store must be present at ${plugin.storeName} in order to use the persistence plugin`)
        }

        const value = await promisify(store.get)(key)

        return this.fromStore(initParams, { key, value })
      }
    }
  }
}

module.exports = StateMachinePersistence
