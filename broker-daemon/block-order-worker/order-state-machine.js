const StateMachine = require('javascript-state-machine')

const OrderStateMachine = StateMachine.factory({
  transitions: [
    { name: 'create', from: 'none', to: 'created' },
    { name: 'goto', from: '*', to: (s) => s }
  ],
  data: function ({ store, logger, relayer, engine }) {
    return { store, logger, relayer, engine, payload: {} }
  },
  methods: {
    onBeforeTransition: function (lifecycle) {
      this.logger.info(`BEFORE: ${lifecycle.transition}`)
    },
    onLeaveState: function (lifecycle) {
      this.logger.info(`LEAVE: ${lifecycle.from}`)
    },
    onEnterState: async function (lifecycle) {
      this.logger.info(`ENTER: ${lifecycle.to}`)

      if (lifecycle.transition === 'goto') {
        this.logger.debug('Skipping database save since we are using a goto')
        return
      }

      if (lifecycle.to === 'none') {
        this.logger.debug('Skipping database save for the \'none\' state')
      }

      const value = JSON.stringify({
        state: this.state,
        payload: this.payload
      })

      // somehow spit an error if this fails?
      await this.store.put(this.id, value)

      this.logger.debug('Saved state machine in store', { id: this.id })
    },
    onAfterTransition: function (lifecycle) {
      this.logger.info(`AFTER: ${lifecycle.transition}`)
    },
    onTransition: function (lifecycle) {
      this.logger.info(`DURING: ${lifecycle.transition} (from ${lifecycle.from} to ${lifecycle.to})`)
    },
    onBeforeCreate: async function (lifecycle, { side, baseSymbol, counterSymbol, baseAmount, counterAmount }) {
      // TODO: move payTo translation somewhere else
      const payTo = `ln:${await this.engine.info.publicKey()}`
      const ownerId = 'TODO: create real owner ids'

      this.payload.payTo = payTo
      this.payload.ownerId = ownerId
      this.payload.side = side
      this.payload.baseSymbol = baseSymbol
      this.payload.counterSymbol = counterSymbol
      this.payload.baseAmount = baseAmount
      this.payload.counterAmount = counterAmount

      const { orderId, feePaymentRequest, depositPaymentRequest } = await this.relayer.createOrder({
        payTo,
        ownerId,
        side,
        baseSymbol,
        counterSymbol,
        baseAmount,
        counterAmount
      })

      this.logger.info(`Created order ${orderId} on the relayer`)

      this.payload.orderId = orderId
      this.id = orderId
      this.payload.feePaymentRequest = feePaymentRequest
      this.payload.depositPaymentRequest = depositPaymentRequest
    }
  }
})

OrderStateMachine.create = async function (initParams, createParams) {
  const osm = new OrderStateMachine(initParams)
  await osm.create(createParams)

  return osm
}

OrderStateMachine.fromStore = function (initParams, { key, value }) {
  const parsedValue = JSON.parse(value)

  const orderStateMachine = new OrderStateMachine(initParams)

  orderStateMachine.id = key
  Object.assign(orderStateMachine.payload, parsedValue.payload)

  orderStateMachine.goto(parsedValue.state)

  return orderStateMachine
}

module.exports = OrderStateMachine
