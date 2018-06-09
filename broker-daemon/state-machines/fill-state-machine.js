const safeid = require('generate-safe-id')
const StateMachine = require('./state-machine')
const StateMachineHistory = require('javascript-state-machine/lib/history')
const StateMachinePersistence = require('./plugins/persistence')
const StateMachineRejection = require('./plugins/rejection')
const StateMachineLogging = require('./plugins/logging')
const { Fill } = require('../models')

/**
 * @class Finite State Machine for managing fill lifecycle
 */
const FillStateMachine = StateMachine.factory({
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
        // this only defines a getter - it will be set by the `fill` setter
        if (!key) {
          return this.fill.key || `NO_RELAYER_KEY_${safeid()}`
        }
      },
      additionalFields: {
        /**
         * @type {StateMachinePersistence~FieldAccessor}
         * @param {Object}   fillObject Stored plain object description of the Fill associated with the State machine
         * @param {String}   key         Unique key for the fill/state machine
         * @returns {Object}             Plain object description of the Fill associated with the State machine
         */
        fill: function (fillObject, key) {
          if (fillObject) {
            this.fill = Fill.fromObject(key, fillObject)
          }

          return this.fill.valueObject
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
   * Definition of the transitions and states for the FillStateMachine
   * @type {Array}
   */
  transitions: [
    /**
     * create transition: the first transtion, from 'none' (the default state) to 'created'
     * @type {Object}
     */
    { name: 'create', from: 'none', to: 'created' },
    /**
     * fillOrder transition: second transition in the order lifecycle
     * @type {Object}
     */
    { name: 'fillOrder', from: 'created', to: 'filled' }
  ],
  /**
   * Instantiate the data on the state machine
   * This function is effectively a constructor for the state machine
   * So we pass it all the objects we'll need later.
   *
   * @param  {sublevel}      options.store       Sublevel partition for storing this fill in
   * @param  {Object}        options.logger
   * @param  {RelayerClient} options.relayer
   * @param  {Engine}        options.engine
   * @param  {Function}      options.onRejection A function to handle rejections of the fill
   * @return {Object}                            Data to attach to the state machine
   */
  data: function ({ store, logger, relayer, engine, onRejection = function () {} }) {
    return { store, logger, relayer, engine, onRejection, fill: {} }
  },
  methods: {
    /**
     * Create the fill on the relayer during transition.
     * This function gets called before the `create` transition (triggered by a call to `create`)
     * Actual creation is done in `onBeforeCreate` so that the transition can be cancelled if creation
     * on the Relayer fails.
     *
     * @param  {Object} lifecycle           Lifecycle object passed by javascript-state-machine
     * @param  {String} order.orderId       Relayer-assigned unique ID for the order being filled
     * @param  {String} order.side          Side of the market the order is on (i.e. BID or ASK)
     * @param  {String} order.baseSymbol    Base symbol (e.g. BTC)
     * @param  {String} order.counterSymbol Counter symbol (e.g. LTC)
     * @param  {String} order.baseAmount    Amount of base currency (in base units) on the order
     * @param  {String} order.counterAmount Amount of counter currency (in base units) on the order
     * @param  {String} fill.fillAmount     Amount of base currency (in base units) of the order to fill
     * @return {void}
     */
    onBeforeCreate: async function (lifecycle, { orderId, side, baseSymbol, counterSymbol, baseAmount, counterAmount }, { fillAmount }) {
      this.fill = new Fill({ orderId, baseSymbol, counterSymbol, side, baseAmount, counterAmount }, { fillAmount })

      const { inboundAmount } = this.fill

      // TODO: when we support more than one chain, we will need to use `inboundSymbol` to choose the right engine
      const swapHash = await this.engine.createSwapHash(this.fill.order.orderId, inboundAmount)
      this.fill.setSwapHash(swapHash)

      const { fillId, feePaymentRequest, depositPaymentRequest } = await this.relayer.takerService.createFill(this.fill.paramsForCreate)
      this.fill.setCreatedParams({ fillId, feePaymentRequest, depositPaymentRequest })

      this.logger.info(`Created fill ${this.fill.fillId} on the relayer`)
    },

    /**
     * Attempt to fill the order as soon as the fill is created
     * @param  {Object} lifecycle Lifecycle object passed by javascript-state-machine
     * @return {void}
     */
    onAfterCreate: function (lifecycle) {
      this.logger.info(`Create transition completed, triggering fill`)

      // you can't start a transition while in another one,
      // so we `nextTick` our way out of the current transition
      // @see {@link https://github.com/jakesgordon/javascript-state-machine/issues/143}
      process.nextTick(() => {
        // we use `tryTo` to move to a rejected state if `fill` fails
        this.tryTo('fillOrder')
      })
    },

    /**
     * Fill the order on the relayer during transition.
     * This function gets called before the `fill` transition (triggered by a call to `fill`)
     * Actual filling on the relayer is done in `onBeforeFill` so that the transition can be cancelled
     * if filling on the Relayer fails.
     *
     * @param  {Object} lifecycle Lifecycle object passed by javascript-state-machine
     * @return {Promise}          romise that rejects if filling on the relayer fails
     */
    onBeforeFillOrder: async function (lifecycle) {
      throw new Error('Filling orders is currently un-implemented')
    },

    /**
     * Log errors from rejection
     * @param  {Object} lifecycle Lifecycle object passed by javascript-state-machine
     * @param  {Error}  error     Error that caused the rejection
     * @return {void}
     */
    onBeforeReject: function (lifecycle, error) {
      if (!error) {
        return this.logger.error(`Rejecting transition without error`)
      }

      this.logger.error(`Encountered error during transition, rejecting`, { message: error.message, stack: error.stack })
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
 * Instantiate and create a fill
 * @param  {Object} initParams   Params to pass to the FillStateMachine constructor (also to the `data` function)
 * @param  {Object} orderParams  Params for the order to pass to the create method (also to the `onBeforeCreate` method)
 * @param  {Object} fillParams   Params for the fill to pass to the create method (also to the `onBeforeCreate` method)
 * @return {Promise<FillStateMachine>}
 */
FillStateMachine.create = async function (initParams, orderParams, fillParams) {
  const fsm = new FillStateMachine(initParams)
  await fsm.tryTo('create', orderParams, fillParams)

  return fsm
}

module.exports = FillStateMachine
