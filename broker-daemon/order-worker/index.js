const createLiveStream = require('level-live-stream')
const EventEmitter = require('events')
const Order = require('./order')

class OrderWorker extends EventEmitter {
  constructor({ orderbooks, store, logger }) {
    this.orderbooks = orderbooks
    this.store = store
    this.logger = logger
    this.liveStream = createLiveStream(this.store)

    this.liveStream
      .on('data', (opts) => {
        if (opts === undefined) {
          this.logger.info('Undefined event in the stream, likely from a delete event')

        } else if (opts.type && opts.type === 'del') {
          this.logger.info(`Delete event in the stream, info: ${opts}`)
          // do nothing right now (we will need to figure out what to send to the cli so that it resets all the records)
        } else if (opts.key && opts.key === 'sync') {
          this.logger.info('Sync event signifying end of old events being added to stream, following events are new')
          // also do nothing right now ({sync: true} is part of level stream, it is added to the stream after all
          // old events have been added to the streak before any new events are added to the stream.)
        } else {
          this.logger.info(`New event being added to stream, event info: ${opts}`)
          const order = Order.fromStorage(opts.key, opts.value)
          this.handleOrder(order)
        }
      })
  }

  handleOrder(order) {
    const orderbook = this.orderbooks.get(order.marketName)

    if(!orderbook) {
      return this.emit('error', new Error(`No orderbook is initialized for created order in the ${order.marketName} market.`))
    }

    this.logger.info('Handling found order', order)

    // TODO: handle order
  }
}

module.exports = OrderWorker
