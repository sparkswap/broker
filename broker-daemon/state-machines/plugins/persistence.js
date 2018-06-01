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
   * @param  {String}                          options.hostName         Name of the property on the state machine instance bearing the host data
   * @param  {Array}                           options.additionalFields List of additional properties on the instance to be persisted
   * @param  {String}                          options.storeName        Name of the property on the state machine where the StateMachinePersistence~Store is located
   * @param  {String}                          options.metadataName     Name of the property on the saved object where metadata should be stored
   * @return {StateMachinePersistence}                                  Plugin-compatible class
   */
  constructor({ hostName = 'payload', additionalFields = {}, storeName = 'store', metadataName = '__stateMachine' } = {}) {
    super()
    this.hostName = hostName
    this.additionalFields = additionalFields
    this.metadataName = metadataName
    this.storeName = storeName
  }

  /**
   * Add the `goto` transition used during re-inflation of state machines
   * @param  {StateMachine~Config} config State machine configuration object
   * @return {void}
   */
  configure(config) {
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
  init(instance) {
    super.init(instance)

    if(!instance[this.storeName] || typeof instance[this.storeName].put !== 'function') {
      throw new Error(`A store must be present on the state machine at ${this.storeName} in order to use the persistence plugin`)
    }
  }

  /**
   * Properties of the state machine that are persisted as metadata
   * @return {Object} Object of property names to persist with serialization and deserialization methods
   */
  get persistedFields () {
    const fields = {
      state: {
        deserialize: function (state) {
          this.goto(state)
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
          return this.persist(this[plugin.hostName])
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
       * Save the current state of the state machine to the store using the `host` as a carrier
       * @param  {Object}        host        Host object to store in the data store with state machine metadata attached
       * @param  {String}        host.key    Unique key that the host can be saved using
       * @param  {Object}        value       Optional host object to include with the persisted state machine
       * @return {Promise<void>}             Promise that resolves when the state is persisted
       */
      persist: async function ({ key, value = {} }) {
        if (!key) {
          throw new Error(`An host key is required to save state`)
        }

        if(!plugin.persistedFields || !Array.isArray(plugin.persistedFields)) {
          throw new Error(`Persisted fields must be an array to persist the state machine`)
        }

        const metadata = {}

        Object.entries(plugin.persistedFields).forEach( ([ name, { serialize } = {} ]) => {
          if(typeof serialize === 'function') {
            metadata[name] = serialize.call(this, this[name])
          } else {
            metadata[name] = this[name]
          }
        })

        const metadataNamespaced = {}

        metadataNamespaced[plugin.metadataName] = metadata

        const valueWithMeta = Object.assign({}, value, metadataNamespaced))

        plugin.hook(this, 'persist', [key, valueWithMeta])

        // somehow spit an error if this fails?
        await promisify(this[plugin.storeName].put)(key, JSON.stringify(valueWithMeta))
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
        const parsedValue = JSON.parse(value)
        const metadata = parsedValue[plugin.metadataName]

        if (!metadata) {
          throw new Error(`Values must have a \`${plugin.metadataName}\` property to be created as persisted state machines`)
        }

        const instance = new this(initParams)

        Object.entries(plugin.persistedFields).forEach( ([ name, { deserialize } = {} ]) => {
          if(typeof deserialize === 'function') {
            deserialize.call(instance, metadata[name])
          } else {
            instance[name] = metadata[name]
          }
        })

        plugin.hook(instance, 'inflate', [key, parsedValue, metadata])

        return instance
      }

      /**
       * Retrieve a single state machine from a given store
       * @param  {String}                        key                Unique key for the state machine in the store
       * @param  {StateMachinePersistence~Store} options[storeName]      Store in which the state machine is located
       * @param  {...Object}                     initParams Other parameters to initialize the state machines with
       * @return {StateMachine}                                     Re-inflated state machine
       */
      get: async function (key, initParams) {
        const store = initParams[plugin.storeName]

        if(!store || typeof store.get !== 'function') {
          throw new Error(`A store must be present at ${plugin.storeName} in order to use the persistence plugin`)
        }

        const value = await promisify(store.get)(key)

        return this.fromStore(initParams, { key, value })
      }

      /**
       * Retrieve and instantiate all state machines from a given store
       * @param  {StateMachinePersistence~Store} options[storeName]      Store that contains the saved state machines
       * @param  {...Object}                     initParams Other parameters to initialize the state machines with
       * @return {Array<StateMachine>}
       */
      getAll: async function (initParams) {
        const store = initParams[plugin.storeName]

        if(!store || typeof store.createReadStream !== 'function') {
          throw new Error(`A store must be present at ${plugin.storeName} in order to use the persistence plugin`)
        }
        return getRecords(store, (key, value) => this.fromStore(initParams, { key, value }))
      }

    }
  }
}

module.exports = StateMachinePersistence
