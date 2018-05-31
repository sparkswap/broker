const { promisify } = require('util')
const { getRecords } = require('../utils')
const StateMachine = require('javascript-state-machine')
const StateMachineHistory = require('javascript-state-machine/lib/history')
const { Order } = require('../models')

/**
 * @class Finite State Machine for managing order lifecycle
 */
const OrderStateMachine = StateMachine.factory({
  plugins: [
    new StateMachineHistory()
  ],
  /**
   * Definition of the transitions and states for the OrderStateMachine
   * @type {Array}
   */
  transitions: [
    /**
     * create transition: the first transtion, from 'none' (the default state) to 'created'
     * @type {Object}
     */
    { name: 'create', from: 'none', to: 'created' },
    /**
     * place transition: second transition in the order lifecycle
     * @type {Object}
     */
    { name: 'place', from: 'created', to: 'placed' },
    /**
     * goto transition: go to the named state from any state, used for re-hydrating from disk
     * @type {Object}
     */
    { name: 'goto', from: '*', to: (s) => s },
    /**
     * reject transition: a created order was rejected during placement
     * @type {Object}
     */
    { name: 'reject', from: 'created', to: 'rejected' }
  ],
  /**
   * Instantiate the data on the state machine
   * This function is effectively a constructor for the state machine
   * So we pass it all the objects we'll need later.
   *
   * @param  {sublevel} options.store         Sublevel partition for storing this order in
   * @param  {Object} options.logger
   * @param  {RelayerClient} options.relayer
   * @param  {Engine} options.engine
   * @return {Object}                         Data to attach to the state machine
   */
  data: function ({ store, logger, relayer, engine }) {
    return { store, logger, relayer, engine, order: {} }
  },
  methods: {
    /**
     * Wrapper for running the next transition with error handling
     * @param  {string}   transitionName Name of the transition to run
     * @param  {...Array} arguments      Arguments to the apply to the transition
     * @return {void}
     */
    nextTransition: function (transitionName, ...args) {
      this.logger.debug(`Queuing transition: ${transitionName}`)
      process.nextTick(async () => {
        this.logger.debug(`Running transition: ${transitionName}`)
        try {
          if (!this.transitions().includes(transitionName)) {
            throw new Error(`${transitionName} is invalid transition from ${this.state}`)
          }

          await this[transitionName](...args)
        } catch (e) {
          // TODO: bubble/handle error
          // TODO: rejected state to clean up paid invoices, etc
          this.logger.error(`Error encountered while running ${transitionName} transition`, e)
          this.reject(e)
        }
      })
    },

    /**
     * Save the current state of the state machine to the store using the `host` as a carrier
     * @param  {Object}        host Host object to store in the data store with state machine metadata attached
     * @return {Promise<void>}      Promise that resolves when the state is persisted
     */
    persist: async function ({ key, valueObject }) {
      if (!key) {
        throw new Error(`An order key is required to save state`)
      }

      if (!valueObject) {
        // console.log('this.order', this.order)
        throw new Error(`An Order object is required to save state`)
      }

      const { state, history } = this
      let error

      if (this.error) {
        error = this.error.message

        if (!error) {
          this.logger.error('Saving state machine error state with no error message', { key })
        }
      }

      const stateMachine = { state, history, error }

      const value = JSON.stringify(Object.assign(valueObject, { __stateMachine: stateMachine }))

      // somehow spit an error if this fails?
      await promisify(this.store.put)(key, value)

      this.logger.debug('Saved state machine in store', { orderId: this.order.orderId })
    },

    onBeforeTransition: function (lifecycle) {
      this.logger.info(`BEFORE: ${lifecycle.transition}`)
    },
    onLeaveState: function (lifecycle) {
      this.logger.info(`LEAVE: ${lifecycle.from}`)
    },

    /**
     * Persist the state machine to disk on entering a new state
     * @param  {Object} lifecycle Lifecycle object passed by javascript-state-machine
     * @return {void}
     */
    onEnterState: async function (lifecycle) {
      this.logger.info(`ENTER: ${lifecycle.to}`)

      if (lifecycle.transition === 'goto') {
        this.logger.debug('Skipping database save since we are using a goto')
      } else if (lifecycle.to === 'none') {
        this.logger.debug('Skipping database save for the \'none\' state')
      } else {
        this.persist(this.order)
      }
    },
    onAfterTransition: function (lifecycle) {
      this.logger.info(`AFTER: ${lifecycle.transition}`)
    },
    onTransition: function (lifecycle) {
      this.logger.info(`DURING: ${lifecycle.transition} (from ${lifecycle.from} to ${lifecycle.to})`)
    },

    /**
     * Create the order on the relayer during transition.
     * This function gets called before the `create` transition (triggered by a call to `create`)
     * Actual creation is done in `onBeforeCreate` so that the transition can be cancelled if creation
     * on the Relayer fails.
     *
     * @param  {Object} lifecycle             Lifecycle object passed by javascript-state-machine
     * @param  {String} options.side          Side of the market being taken (i.e. BID or ASK)
     * @param  {String} options.baseSymbol    Base symbol (e.g. BTC)
     * @param  {String} options.counterSymbol Counter symbol (e.g. LTC)
     * @param  {String} options.baseAmount    Amount of base currency (in base units) to be traded
     * @param  {String} options.counterAmount Amount of counter currency (in base units) to be traded
     * @return {void}
     */
    onBeforeCreate: async function (lifecycle, { side, baseSymbol, counterSymbol, baseAmount, counterAmount }) {
      // TODO: move payTo translation somewhere else
      // TODO: figure out a way to cache the publicKey instead of making a request
      const payTo = `ln:${await this.engine.getPublicKey()}`
      const ownerId = 'TODO: create real owner ids'

      this.order = new Order({ baseSymbol, counterSymbol, side, baseAmount, counterAmount, payTo, ownerId })

      this.order.addCreatedParams(await this.relayer.createOrder(this.order.createParams))

      this.logger.info(`Created order ${this.order.orderId} on the relayer`)
    },

    /**
     * Attempt to place the order as soon as its created
     * @param  {Object} lifecycle Lifecycle object passed by javascript-state-machine
     * @return {void}
     */
    onAfterCreate: function (lifecycle) {
      this.logger.info(`Create transition completed, triggering place`)

      this.nextTransition('place')
    },

    /**
     * Place the order on the relayer during transition.
     * This function gets called before the `place` transition (triggered by a call to `place`)
     * Actual placement on the relayer is done in `onBeforePlace` so that the transition can be cancelled
     * if placement on the Relayer fails.
     *
     * @param  {Object} lifecycle                           Lifecycle object passed by javascript-state-machine
     * @return {Promise}                                    Promise that rejects if placement on the relayer fails
     */
    onBeforePlace: async function (lifecycle) {
      throw new Error('Placing orders is currently un-implemented')
    },

    /**
     * Handle rejection by assigning the error to the state machine
     * @param  {Object} lifecycle Lifecycle object passed by javascript-state-machine
     * @param  {Object} error     Error that triggered rejection
     * @return {void}
     */
    onBeforeReject: function (lifecycle, error) {
      this.error = error
    }
  }
})

/**
 * Instantiate and create an order
 * @param  {Object} initParams   Params to pass to the OrderStateMachine constructor (also to the `data` function)
 * @param  {Object} createParams Params to pass to the create method (also to the `onBeforeCreate` method)
 * @return {Promise<OrderStateMachine>}
 */
OrderStateMachine.create = async function (initParams, createParams) {
  const osm = new OrderStateMachine(initParams)
  await osm.create(createParams)

  return osm
}

/**
 * Retrieve and instantiate all order state machines from a given store
 * @param  {sublevel}    options.store      Sublevel that contains the saved order state machines
 * @param  {...Object}   options.initParams Other parameters to initialize the state machines with
 * @return {Array<OrderStateMachine>}
 */
OrderStateMachine.getAll = async function ({ store, ...initParams }) {
  return getRecords(store, (key, value) => this.fromStore({ store, ...initParams }, { key, value }))
}

/**
 * Re-hydrate an OrderStateMachine from storage
 * @param  {Object} initParams    Params to pass to the OrderStateMachine constructor (also to the `data` function)
 * @param  {String} options.key   Stored key (i.e. the Order ID)
 * @param  {String} options.value Stringified JSON of the Order State Machine object
 * @return {OrderStateMachine}
 */
OrderStateMachine.fromStore = function (initParams, { key, value }) {
  const parsedValue = JSON.parse(value)
  const stateMachine = parsedValue.__stateMachine

  if (!stateMachine) {
    throw new Error('Values must have a `__stateMachine` property to be created as state machines')
  }

  const orderStateMachine = new OrderStateMachine(initParams)

  orderStateMachine.order = Order.fromObject(key, parsedValue)

  // re-inflate state machine properties

  // state machine current state
  orderStateMachine.goto(stateMachine.state)

  // state machine history
  orderStateMachine.clearHistory()
  orderStateMachine.history = stateMachine.history

  // state machine errors
  orderStateMachine.error = new Error(stateMachine.error)

  return orderStateMachine
}

module.exports = OrderStateMachine
