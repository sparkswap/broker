const { promisify } = require('util')
const { getRecords } = require('../utils')
const StateMachine = require('javascript-state-machine')
const { Order } = require('../models')

/**
 * @class Finite State Machine for managing order lifecycle
 */
const OrderStateMachine = StateMachine.factory({
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
     * goto transition: go to the named state from any state, used for re-hydrating from disk
     * @type {Object}
     */
    { name: 'goto', from: '*', to: (s) => s }
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
        return
      }

      if (lifecycle.to === 'none') {
        this.logger.debug('Skipping database save for the \'none\' state')
        return
      }

      // somehow spit an error if this fails?
      await promisify(this.store.put)(this.order.key, JSON.stringify(Object.assign(this.order.valueObject, { __state: this.state })))

      this.logger.debug('Saved state machine in store', { orderId: this.order.orderId })
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
      const payTo = `ln:${await this.engine.info.publicKey()}`
      const ownerId = 'TODO: create real owner ids'

      this.order = new Order({ baseSymbol, counterSymbol, side, baseAmount, counterAmount, payTo, ownerId })

      this.order.addCreatedParams(await this.relayer.createOrder(this.order.createParams))

      this.logger.info(`Created order ${this.order.orderId} on the relayer`)
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

  const orderStateMachine = new OrderStateMachine(initParams)

  orderStateMachine.order = Order.fromObject(key, parsedValue)

  orderStateMachine.goto(parsedValue.__state)

  return orderStateMachine
}

module.exports = OrderStateMachine
