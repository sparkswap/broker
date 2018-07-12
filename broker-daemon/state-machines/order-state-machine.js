const safeid = require('generate-safe-id')
const StateMachine = require('./state-machine')
const StateMachineHistory = require('javascript-state-machine/lib/history')
const StateMachinePersistence = require('./plugins/persistence')
const StateMachineRejection = require('./plugins/rejection')
const StateMachineLogging = require('./plugins/logging')
const { Order } = require('../models')

/**
 * If Orders are saved in the database before they are created on the remote, they lack an ID
 * This string indicates an order that does not have an assigned remote ID
 * @type {String}
 * @constant
 * @default
 */
const UNASSIGNED_PREFIX = 'NO_ASSIGNED_ID_'

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
          return this.order.key || `${UNASSIGNED_PREFIX}${safeid()}`
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
    { name: 'place', from: 'created', to: 'placed' },

    /**
     * cancel transition: cancel an outstanding created or placed order
     * @todo monitor for refunds from the relayer
     * @type {Object}
     */
    { name: 'cancel', from: 'placed', to: 'cancelled' },

    /**
     * execute transition: prepare the swap for execution, and tell the relayer
     * @type {Object}
     */
    { name: 'execute', from: 'placed', to: 'executing' }
  ],
  /**
   * Instantiate the data on the state machine
   * This function is effectively a constructor for the state machine
   * So we pass it all the objects we'll need later.
   *
   * @param  {sublevel}            options.store       Sublevel partition for storing this order in
   * @param  {Object}              options.logger
   * @param  {RelayerClient}       options.relayer
   * @param  {Map<String, Engine>} options.engines     Map of all available engines
   * @param  {Function}            options.onRejection A function to handle rejections of the order
   * @return {Object}                                  Data to attach to the state machine
   */
  data: function ({ store, logger, relayer, engines, onRejection = function () {} }) {
    return { store, logger, relayer, engines, onRejection, order: {} }
  },
  methods: {
    /**
     * Create the order on the relayer during transition.
     * This function gets called before the `create` transition (triggered by a call to `create`)
     * Actual creation is done in `onBeforeCreate` so that the transition can be cancelled if creation
     * on the Relayer fails.
     *
     * @param  {Object} lifecycle             Lifecycle object passed by javascript-state-machine
     * @param  {String} blockOrderid          Id of the block order that the order belongs to
     * @param  {String} options.side          Side of the market being taken (i.e. BID or ASK)
     * @param  {String} options.baseSymbol    Base symbol (e.g. BTC)
     * @param  {String} options.counterSymbol Counter symbol (e.g. LTC)
     * @param  {String} options.baseAmount    Amount of base currency (in base units) to be traded
     * @param  {String} options.counterAmount Amount of counter currency (in base units) to be traded
     * @return {void}
     */
    onBeforeCreate: async function (lifecycle, blockOrderId, { side, baseSymbol, counterSymbol, baseAmount, counterAmount }) {
      const ownerId = 'TODO: create real owner ids'

      this.order = new Order(blockOrderId, { baseSymbol, counterSymbol, side, baseAmount, counterAmount, ownerId })
      // TODO: figure out a way to cache the maker address instead of making a request
      const inboundEngine = this.engines.get(this.order.inboundSymbol)
      if (!inboundEngine) {
        throw new Error(`No engine available for ${this.order.inboundSymbol}`)
      }
      this.order.makerAddress = await inboundEngine.getPaymentChannelNetworkAddress()

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
     * Listen for order fills when in the `placed` state
     * This is done based on the state and not the transition so that it gets actioned when being re-hydrated from storage
     * [is that the right thing to do?]
     * @param  {Object} lifecycle Lifecycle object passed by javascript-state-machine
     * @return {void}
     */
    onBeforePlace: async function (lifecycle) {
      const { feePaymentRequest, depositPaymentRequest, orderId, outboundSymbol } = this.order

      if (!feePaymentRequest) throw new Error('Cant pay invoices because fee invoice does not exist')
      if (!depositPaymentRequest) throw new Error('Cant pay invoices because deposit invoice does not exist')

      this.logger.debug(`Attempting to pay fees for order: ${orderId}`)

      const outboundEngine = this.engines.get(outboundSymbol)
      if (!outboundEngine) {
        throw new Error(`No engine available for ${outboundSymbol}`)
      }

      const [feeRefundPaymentRequest, depositRefundPaymentRequest] = await Promise.all([
        outboundEngine.createRefundInvoice(feePaymentRequest),
        outboundEngine.createRefundInvoice(depositPaymentRequest),
        outboundEngine.payInvoice(feePaymentRequest),
        outboundEngine.payInvoice(depositPaymentRequest)
      ])

      this.logger.info('Received response for successful payment')

      this.logger.debug('Response from engine', {
        feeRefundPaymentRequest,
        depositRefundPaymentRequest
      })

      this.logger.info(`Successfully paid fees for order: ${orderId}`)

      // NOTE: this method should NOT reject a promise, as that may prevent the state of the order from saving
      const call = this.relayer.makerService.placeOrder({ orderId, feeRefundPaymentRequest, depositRefundPaymentRequest })

      call.on('error', (e) => {
        this.reject(e)
      })

      call.on('data', ({ orderStatus, fill }) => {
        try {
          // the Relayer will send a single data message containing the order's state as cancelled and close
          // the stream if the order has been cancelled. We should handle that and cancel the order locally.
          if (OrderStateMachine.STATES[orderStatus] === OrderStateMachine.STATES.CANCELLED) {
            this.logger.info(`Order ${orderId} was cancelled on the relayer, cancelling locally.`)
            return this.tryTo('cancel')
          }

          this.logger.info(`Placed order ${this.order.orderId} on the relayer`)
          const { swapHash, fillAmount, takerAddress } = fill

          this.order.setFilledParams({ swapHash, fillAmount, takerAddress })

          this.logger.info(`Order ${this.order.orderId} is being filled`)
          this.tryTo('execute')
        } catch (e) {
          this.reject(e)
        }
      })
    },

    /**
     * Prepare for execution and notify the relayer when preparation is complete
     * This function gets called before the `execute` transition (triggered by a call to `execute`)
     * Action is taken in `onBeforeExecute` so that the transition will fail if this function rejects its promise
     *
     * @param  {Object} lifecycle Lifecycle object passed by javascript-state-machine
     * @return {Promise}          Promise that rejects if execution prep or notification fails
     */
    onBeforeExecute: async function (lifecycle) {
      const { orderId, swapHash, symbol, amount } = this.order.paramsForPrepareSwap
      const engine = this.engines.get(symbol)
      if (!engine) {
        throw new Error(`No engine available for ${symbol}`)
      }
      await engine.prepareSwap(orderId, swapHash, amount)
      return this.relayer.makerService.executeOrder({ orderId })
    },

    /**
     * Log errors from rejection
     * @param  {Object} lifecycle Lifecycle object passed by javascript-state-machine
     * @param  {Error}  error     Error that caused the rejection
     * @return {void}
     */
    onBeforeReject: function (lifecycle, error) {
      this.logger.error(`Encountered error during transition, rejecting`, error)
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
 * This method is a pure pass through to the state machine, so any parameter checking should happen in
 * `data` and `onBeforeCreate`, respectively.
 * @param  {Object} initParams   Params to pass to the OrderStateMachine constructor (also to the `data` function)
 * @param  {Object} createParams Params to pass to the create method (also to the `onBeforeCreate` method)
 * @return {Promise<OrderStateMachine>}
 */
OrderStateMachine.create = async function (initParams, ...createParams) {
  const osm = new OrderStateMachine(initParams)
  await osm.tryTo('create', ...createParams)

  return osm
}

OrderStateMachine.STATES = Object.freeze({
  NONE: 'none',
  CREATED: 'created',
  PLACED: 'placed',
  CANCELLED: 'cancelled'
})

module.exports = OrderStateMachine
