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
          return this.fill.key
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
  transitions: [],
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
     * Handle rejected state by calling a passed in handler
     * @param  {Object} lifecycle Lifecycle object passed by javascript-state-machine
     * @return {void}
     */
    onAfterReject: async function (lifecycle) {
      this.onRejection(this.error)
    }
  }
})

module.exports = FillStateMachine
