const StateMachineHistory = require('javascript-state-machine/lib/history')
const grpc = require('grpc')

// We require order directly to avoid cycles with models index
const Order = require('../models/order')
const { generateId, payInvoice } = require('../utils')

const StateMachine = require('./state-machine')
const {
  StateMachinePersistence,
  StateMachineRejection,
  StateMachineLogging,
  StateMachineEvents
} = require('./plugins')

/**
 * If Orders are saved in the database before they are created on the remote, they lack an ID
 * This string indicates an order that does not have an assigned remote ID
 *
 * @constant
 * @type {string}
 * @default
 */
const UNASSIGNED_PREFIX = 'NO_ASSIGNED_ID_'

/**
 * Error codes that can come back from the relayer
 * Note: Error code 14 is associated with gRPC status code 14, the service is UNAVAILABLE
 * @type {Object}
 */
const ORDER_ERROR_CODES = Object.freeze({
  RELAYER_UNAVAILABLE: 'RELAYER_UNAVAILABLE'
})

/**
 * @class Finite State Machine for managing order lifecycle
 */
const OrderStateMachine = StateMachine.factory({
  plugins: [
    new StateMachineHistory(),
    new StateMachineRejection(),
    new StateMachineLogging({
      skipTransitions: [ 'goto' ]
    }),
    new StateMachineEvents(),
    new StateMachinePersistence({
      /**
       * @type {StateMachinePersistence~KeyAccessor}
       * @param {string}   key - Unique key for the stored state machine
       * @returns {string}     Unique key for the state machine
       */
      key: function (key) {
        // this only defines a getter - it will be set by the `order` setter
        if (!key) {
          return this.order.key || `${UNASSIGNED_PREFIX}${generateId()}`
        }
      },
      additionalFields: {
        /**
         * @type {StateMachinePersistence~FieldAccessor}
         * @param {Object}   orderObject - Stored plain object description of the Order associated with the State machine
         * @param {string}   key         - Unique key for the order/state machine
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
         * @param {Array<string>}   history - Stored history of states for this state machine
         * @returns {Array<string>}         History of states for this state machine
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
         * @param {string}   errorMessage - Stored error message for a state machine in an errored state
         * @returns {string}              Error message for a state machine in an errored state
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
     * create transition: the first transition, from 'none' (the default state) to 'created'
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
    { name: 'execute', from: 'placed', to: 'executing' },

    /**
     * complete transition: monitor the payment channel network for settlement,
     * and provide the preimage to the Relayer to get our deposit back.
     * @type {Object}
     */
    { name: 'complete', from: 'executing', to: 'completed' }
  ],
  /**
   * Instantiate the data on the state machine
   * This function is effectively a constructor for the state machine
   * So we pass it all the objects we'll need later.
   *
   * @param  {Object} options
   * @param  {sublevel}            options.store       - Sublevel partition for storing this order in
   * @param  {Object}              options.logger
   * @param  {RelayerClient}       options.relayer
   * @param  {Map<string, Engine>} options.engines     - Map of all available engines
   * @returns {Object}                                  Data to attach to the state machine
   */
  data: function ({ store, logger, relayer, engines }) {
    return { store, logger, relayer, engines, order: {} }
  },
  methods: {
    /**
     * Create the order on the relayer during transition.
     * This function gets called before the `create` transition (triggered by a call to `create`)
     * Actual creation is done in `onBeforeCreate` so that the transition can be cancelled if creation
     * on the Relayer fails.
     *
     * @param {Object} lifecycle - Lifecycle object passed by javascript-state-machine
     * @param {string} blockOrderid - Id of the block order that the order belongs to
     * @param {Object} opts
     * @param {string} opts.side          - Side of the market being taken (i.e. BID or ASK)
     * @param {string} opts.baseSymbol    - Base symbol (e.g. BTC)
     * @param {string} opts.counterSymbol - Counter symbol (e.g. LTC)
     * @param {string} opts.baseAmount    - Amount of base currency (in base units) to be traded
     * @param {string} opts.counterAmount - Amount of counter currency (in base units) to be traded
     * @returns {void}
     */

    onBeforeCreate: async function (lifecycle, blockOrderId, { side, baseSymbol, counterSymbol, baseAmount, counterAmount }) {
      this.order = new Order(blockOrderId, { baseSymbol, counterSymbol, side, baseAmount, counterAmount })
      // TODO: figure out a way to cache the maker address instead of making a request
      const baseEngine = this.engines.get(this.order.baseSymbol)
      if (!baseEngine) {
        throw new Error(`No engine available for ${this.order.baseSymbol}`)
      }

      const counterEngine = this.engines.get(this.order.counterSymbol)
      if (!counterEngine) {
        throw new Error(`No engine available for ${this.order.counterSymbol}`)
      }
      this.order.makerBaseAddress = await baseEngine.getPaymentChannelNetworkAddress()
      this.order.makerCounterAddress = await counterEngine.getPaymentChannelNetworkAddress()

      const authorization = this.relayer.identity.authorize()

      const {
        orderId,
        feePaymentRequest,
        feeRequired,
        depositPaymentRequest,
        depositRequired
      } = await this.relayer.makerService.createOrder(this.order.paramsForCreate, authorization)

      this.order.setCreatedParams({
        orderId,
        feePaymentRequest,
        feeRequired,
        depositPaymentRequest,
        depositRequired
      })

      this.logger.info(`Created order ${this.order.orderId} on the relayer`)
    },

    /**
     * Attempt to place the order as soon as its created
     * @param  {Object} lifecycle - Lifecycle object passed by javascript-state-machine
     * @returns {void}
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
     * @param  {Object} lifecycle - Lifecycle object passed by javascript-state-machine
     * @returns {void}
     */
    onBeforePlace: async function (lifecycle) {
      const {
        feePaymentRequest,
        feeRequired,
        depositPaymentRequest,
        depositRequired,
        orderId,
        outboundSymbol
      } = this.order.paramsForPlace

      const outboundEngine = this.engines.get(outboundSymbol)
      if (!outboundEngine) {
        throw new Error(`No engine available for ${outboundSymbol}`)
      }

      this.logger.debug(`Paying fee and deposit invoices for ${orderId}`)

      let payFeeInvoice
      let payDepositInvoice

      if (feeRequired) {
        payFeeInvoice = payInvoice(outboundEngine, feePaymentRequest)
      } else {
        this.logger.debug(`Skipping paying fee invoice for ${orderId}, not required`)
      }

      if (depositRequired) {
        payDepositInvoice = payInvoice(outboundEngine, depositPaymentRequest)
      } else {
        this.logger.debug(`Skipping paying deposit invoice for ${orderId}, not required`)
      }

      // Note that if the fee or deposit is not required the corresponding refund payment
      // requests will be undefined as they will be `await`ing an undefined promise
      const [
        feeRefundPaymentRequest,
        depositRefundPaymentRequest
      ] = await Promise.all([
        payFeeInvoice,
        payDepositInvoice
      ])

      const authorization = this.relayer.identity.authorize()
      // NOTE: this method should NOT reject a promise, as that may prevent the state of the order from saving
      const call = this.relayer.makerService.placeOrder({
        orderId,
        feeRefundPaymentRequest,
        depositRefundPaymentRequest
      }, authorization)

      // Stop listening to further events from the stream
      const finish = () => {
        call.removeListener('error', errHandler)
        call.removeListener('end', endHandler)
        call.removeListener('data', dataHandler)
      }

      const errHandler = (e) => {
        const relayerError = e.code === grpc.status.UNAVAILABLE ? new Error(ORDER_ERROR_CODES.RELAYER_UNAVAILABLE) : e
        this.reject(relayerError)
        finish()
      }
      const endHandler = () => {
        const err = new Error(`PlaceOrder stream for ${orderId} ended early by Relayer`)
        this.reject(err)
        finish()
      }
      const dataHandler = ({ orderStatus, fill }) => {
        try {
          if (OrderStateMachine.STATES[orderStatus] === OrderStateMachine.STATES.CANCELLED) {
            // the Relayer will send a single data message containing the order's state as cancelled and close
            // the stream if the order has been cancelled. We should handle that and cancel the order locally.
            this.logger.info(`Order ${orderId} was cancelled on the relayer, cancelling locally.`, { orderId })
            this.tryTo('cancel')
          } else {
            this.logger.info(`Order ${this.order.orderId} is being filled`, { orderId })

            const { swapHash, fillAmount, takerAddress } = fill
            this.order.setFilledParams({ swapHash, fillAmount, takerAddress })
            this.tryTo('execute')
          }
        } catch (e) {
          this.reject(e)
        } finally {
          finish()
        }
      }

      // Set listeners on the call
      call.on('error', errHandler)
      call.on('end', endHandler)
      call.on('data', dataHandler)

      this.logger.info(`Placed order ${orderId} on the relayer`, { orderId })
    },

    /**
     * Prepare for execution and notify the relayer when preparation is complete
     * This function gets called before the `execute` transition (triggered by a call to `execute`)
     * Action is taken in `onBeforeExecute` so that the transition will fail if this function rejects its promise
     *
     * @param  {Object} lifecycle - Lifecycle object passed by javascript-state-machine
     * @returns {void} Promise that rejects if execution prep or notification fails
     */
    onBeforeExecute: async function (lifecycle) {
      const { orderId, swapHash, symbol, amount } = this.order.paramsForPrepareSwap
      const engine = this.engines.get(symbol)
      if (!engine) {
        throw new Error(`No engine available for ${symbol}`)
      }
      await engine.prepareSwap(orderId, swapHash, amount)

      const authorization = this.relayer.identity.authorize()
      await this.relayer.makerService.executeOrder({ orderId }, authorization)
    },

    /**
     * Trigger settle after execution
     * @param  {Object} lifecycle - Lifecycle object passed by javascript-state-machine
     * @returns {void}
     */
    onAfterExecute: function (lifecycle) {
      this.triggerComplete()
    },

    /**
     * Returns true if there is a relayer error associated with the order, false if not
     * This is just a getter function, no transition associated
     * @returns {boolean}
     */
    shouldRetry: function () {
      return !!this.order.error && this.order.error.message === ORDER_ERROR_CODES.RELAYER_UNAVAILABLE
    },

    /**
     * Trigger settle if we are re-hydrating state into the executing state
     * @param  {Object} lifecycle - Lifecycle object passed by javascript-state-machine
     * @returns {void}
     */
    triggerState: function (lifecycle) {
      if (this.state === 'executing') {
        this.triggerComplete()
      } else if (this.state === 'created' || this.state === 'placed') {
        process.nextTick(() => this.tryTo('cancel'))
      }
    },
    /**
     * As soon as we are done with our part of execution, listen to the Payment Channel Network for settlements.
     * This method should be called after the execution transition AND after a goto transition back to the
     * execution state to enable re-hydrating state machines to continue to monitor the network. We do this rather
     * than `onEnterState` to avoid moving to a new state prior to saving the current state (which happens in
     * `onEnterState` as part of the persistence plugin.)
     * @returns {void}
     */
    triggerComplete: function () {
      // you can't start a transition while in another one,
      // so we `nextTick` our way out of the current transition
      // @see {@link https://github.com/jakesgordon/javascript-state-machine/issues/143}
      process.nextTick(() => this.tryTo('complete'))
    },

    /**
     * Monitor the Payment Channel Network for settlements, and return the preimage
     * to the Relayer so we can reimbursed for our deposit.
     * We perform the settlement monitoring and order completion in the same action
     * since settlement monitoring can be repeated with no issue.
     * @param  {Object} lifecycle - Lifecycle object passed by javascript-state-machine
     * @returns {Promise}
     */
    onBeforeComplete: async function (lifecycle) {
      const { swapHash, symbol } = this.order.paramsForGetPreimage
      const engine = this.engines.get(symbol)
      if (!engine) {
        throw new Error(`No engine available for ${symbol}`)
      }

      // The action below is a potentially very long-running operation, since the settlement
      // of the swap itself is highly variable.
      // TODO: restart monitoring when coming back from an offline state.
      const swapPreimage = await engine.getSettledSwapPreimage(swapHash)
      this.order.setSettledParams({ swapPreimage })

      const { orderId } = this.order.paramsForComplete
      const authorization = this.relayer.identity.authorize()
      return this.relayer.makerService.completeOrder({ orderId, swapPreimage }, authorization)
    },

    /**
     * Log errors from rejection
     * @param  {Object} lifecycle - Lifecycle object passed by javascript-state-machine
     * @param  {Error}  error     - Error that caused the rejection
     * @returns {void}
     */
    onBeforeReject: function (lifecycle, error) {
      this.logger.error(`Encountered error during transition, rejecting`, error)
      this.order.error = error
    }
  }
})

/**
 * Instantiate and create an order
 * This method is a pure pass through to the state machine, so any parameter checking should happen in
 * `data` and `onBeforeCreate`, respectively.
 * @param  {Object} initParams   - Params to pass to the OrderStateMachine constructor (also to the `data` function)
 * @param  {Object} createParams - Params to pass to the create method (also to the `onBeforeCreate` method)
 * @returns {Promise<OrderStateMachine>}
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
  CANCELLED: 'cancelled',
  EXECUTING: 'executing',
  COMPLETED: 'completed',
  REJECTED: 'rejected'
})

OrderStateMachine.INDETERMINATE_STATES = Object.freeze({
  CREATED: 'created',
  PLACED: 'placed',
  EXECUTING: 'executing'
})

module.exports = OrderStateMachine
