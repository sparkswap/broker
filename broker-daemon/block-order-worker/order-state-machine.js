const StateMachine = require('javascript-state-machine')

const OrderStateMachine = StateMachine.factory({
  transitions: [
    { name: 'create', from: 'none', to: 'created' },
    { name: 'goto', from: '*', to: (s) => s }
  ],
  data: function (store, logger, relayer) {
    return { store, logger, relayer, payload: {} }
  },
  methods: {
    onBeforeTransition: function(lifecycle) {
      this.logger.info(`BEFORE: ${lifecycle.transition}`)
    },
    onLeaveState: function(lifecycle) {
      this.logger.info(`LEAVE: ${lifecycle.from}`)
    },
    onEnterState: function(lifecycle) {
      this.logger.info(`ENTER: ${lifecycle.to}`)
    },
    onAfterTransition: function(lifecycle) {
      this.logger.info(`AFTER: ${lifecycle.transition}`)

      if(lifecycle.transition === 'goto') {
        this.logger.debug('Skipping database save since we are using a goto')
        return
      }

      const value = JSON.stringify({
        state: this.state,
        payload: this.payload
      })

      store.put(this.id, storeValue)
    },
    onTransition: function(lifecycle) {
      this.logger.info(`DURING: ${lifecycle.transition} (from ${lifecycle.from} to ${lifecycle.to})`)
    },
    onBeforeCreate: async function (lifecycle, { side, baseSymbol, counterSymbol, baseAmount, counterAmount }) {
      this.payload.side = side
      this.payload.baseSymbol = baseSymbol
      this.payload.counterSymbol = counterSymbol
      this.payload.baseAmount = baseAmount
      this.payload.counterAmount = counterAmount

      const { orderId, feePaymentRequest, depositPaymentRequest } = await this.relayer.createOrder({
        // TODO: payTo, ownerId
        side,
        baseSymbol,
        counterSymbol,
        baseAmount,
        counterAmount
      })

      this.payload.orderId = orderId
      this.id = orderId
      this.payload.feePaymentRequest = feePaymentRequest
      this.payload.depositPaymentRequest = depositPaymentRequest

      return { orderId, feePaymentRequest, depositPaymentRequest }
    }
  }
})

OrderStateMachine.fromStore = function (initParams, { key, value }) {
  const parsedValue = JSON.parse(value)

  const orderStateMachine = new OrderStateMachine(initParams)

  orderStateMachine.id = key
  Object.assign(orderStateMachin.payload, parsedValue.payload)

  orderStateMachine.goto(parsedValue.state)

  return orderStateMachine
}