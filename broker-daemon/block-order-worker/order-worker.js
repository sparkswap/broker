class OrderWorker {
  constructor({ relayer, store, logger }) {
    this.relayer = relayer
    this.store = store
    this.logger = logger
  }

  async createOrder({ side, baseSymbol, counterSymbol, baseAmount, counterAmount }) {
    this.logger.info('Creating an order on the Relayer: UNIMPLEMENTED')
  }
}

module.exports = OrderWorker
