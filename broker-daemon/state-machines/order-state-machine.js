const StateMachine = require('./state-machine')
const StateMachineHistory = require('javascript-state-machine/lib/history')
const StateMachinePersistence = require('./plugins/persistence')
const StateMachineRejection = require('./plugins/rejection')
const StateMachineLogging = require('./plugins/logging')
const { Order } = require('../models')

/**
 * @class Finite State Machine for managing order lifecycle
 */
const OrderStateMachine = StateMachine.factory({
  plugins: [
    new StateMachineHistory(),
    new StateMachineRejection(),
    new StateMachineLogging(),
    new StateMachinePersistence({
      /**
       * @type {StateMachinePersistence~KeyAccessor}
       * @param {String}   key Unique key for the stored state machine
       * @returns {String}     Unique key for the state machine
       */
      key: function (key) {
        // this only defines a getter - it will be set by the `order` setter
        if (!key) {
          return this.order.key
        }
      },
      additionalFields: {
        /**
         * @type {StateMachinePersistence~FieldAccessor}
         * @param {Object}   orderObject Stored plain object description of the Order associated with the State machine
         * @param {String}   key         Unique key for the order/state machine
         * @returns {Object}             Plain object description of the Order associated with the State machine
         */
        order: function (orderObject, key) {
          if (orderObject) {
            this.order = Order.fromObject(key, orderObject)
          }

          return this.order.valueObject
        },
        /**
         * @type  {StateMachinePersistence~FieldAccessor}
         * @param {Array<String>}   history Stored history of states for this state machine
         * @returns {Array<String>}         History of states for this state machine
         */
        history: function (history) {
          if (history) {
            this.clearHistory()
            this.history = history
          }

          return this.history
        },
        /**
         * @type {StateMachinePersistence~FieldAccessor}
         * @param {String}   errorMessage Stored error message for a state machine in an errored state
         * @returns {String}              Error message for a state machine in an errored state
         */
        error: function (errorMessage) {
          if (errorMessage) {
            this.error = new Error(errorMessage)
          }

          if (this.error) {
            return this.error.message
          }
        }
      }
    })
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
    { name: 'place', from: 'created', to: 'placed' }
  ],
  /**
   * Instantiate the data on the state machine
   * This function is effectively a constructor for the state machine
   * So we pass it all the objects we'll need later.
   *
   * @param  {sublevel}      options.store       Sublevel partition for storing this order in
   * @param  {Object}        options.logger
   * @param  {RelayerClient} options.relayer
   * @param  {Engine}        options.engine
   * @param  {Function}      options.onRejection A function to handle rejections of the order
   * @return {Object}                            Data to attach to the state machine
   */
  data: function ({ store, logger, relayer, engine, onRejection = function () {} }) {
    return { store, logger, relayer, engine, onRejection, order: {} }
  },
  methods: {
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

      const { orderId, feePaymentRequest, depositPaymentRequest } = await this.relayer.makerService.createOrder(this.order.paramsForCreate)
      this.order.setCreatedParams({ orderId, feePaymentRequest, depositPaymentRequest })

      this.logger.info(`Created order ${this.order.orderId} on the relayer`)
    },

    /**
     * Attempt to place the order as soon as its created
     * @param  {Object} lifecycle Lifecycle object passed by javascript-state-machine
     * @return {void}
     */
    onAfterCreate: function (lifecycle) {
      this.logger.info(`Create transition completed, triggering place`)

      // you can't start a transition while in another one,
      // so we `nextTick` our way out of the current transition
      // @see {@link https://github.com/jakesgordon/javascript-state-machine/issues/143}
      process.nextTick(() => {
        // we use `tryTo` to move to a rejected state if `place` fails
        this.tryTo('place')
      })
    },

    /**
     * Place the order on the relayer during transition.
     * This function gets called before the `place` transition (triggered by a call to `place`)
     * Actual placement on the relayer is done in `onBeforePlace` so that the transition can be cancelled
     * if placement on the Relayer fails.
     *
     * @param  {Object} lifecycle Lifecycle object passed by javascript-state-machine
     * @return {Promise}          romise that rejects if placement on the relayer fails
     */
    onBeforePlace: async function (lifecycle) {
      throw new Error('Placing orders is currently un-implemented')
    },

    /**
     * Handle rejected state by calling a passed in handler
     * @param  {Object} lifecycle Lifecycle object passed by javascript-state-machine
     * @return {void}
     */
    onAfterReject: async function (lifecycle) {
      this.onRejection(this.error)
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
  await osm.tryTo('create', createParams)

  return osm
}

module.exports = OrderStateMachine
