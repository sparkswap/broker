const grpc = require('grpc')

const { MarketEvent } = require('../models')
const { loadProto } = require('../utils')

// TODO: Add this to config for CLI
const EXCHANGE_RPC_HOST = process.env.EXCHANGE_RPC_HOST || 'localhost:28492'
const RELAYER_PROTO_PATH = './proto/relayer.proto'

class RelayerClient {
  constructor (logger) {
    this.logger = logger || console
    this.address = EXCHANGE_RPC_HOST
    this.proto = loadProto(RELAYER_PROTO_PATH)

    // TODO: we will need to add auth for daemon for a non-local address
    this.maker = new this.proto.Maker(this.address, grpc.credentials.createInsecure())
    this.orderbook = new this.proto.OrderBook(this.address, grpc.credentials.createInsecure())
    this.health = new this.proto.Health(this.address, grpc.credentials.createInsecure())
  }

  /**
   * Creates an order w/ the exchange
   *
   * @param {Object} params
   * @returns {Promise}
   */
  async createOrder (params) {
    const deadline = grpcDeadline()

    return new Promise((resolve, reject) => {
      this.maker.createOrder(params, { deadline }, (err, res) => {
        if (err) return reject(err)
        return resolve(res)
      })
    })
  }

  /**
   * Opens a stream with the exchange to watch for market events
   *
   * @param {EventEmitter} eventHandler
   * @param {LevelUP} store
   * @param {Object} params
   * @returns {Promise<void>} a promise that resolves when the market is up to date with the remote relayer
   */
  watchMarket (store, { baseSymbol, counterSymbol, lastUpdated }) {
    return new Promise(async (resolve, reject) => {
      const params = { baseSymbol, counterSymbol, lastUpdated }
      const RESPONSE_TYPES = this.proto.WatchMarketResponse.ResponseTypes

      this.logger.info('Setting up market watcher', params)

      let watcher

      try {
        watcher = await this.orderbook.watchMarket(params)
      } catch (e) {
        return reject(e)
      }

      watcher.on('end', () => {
        this.logger.info('Remote ended stream', params)
        // TODO: retry stream?
        throw new Error(`Remote relayer ended stream for ${baseSymbol}/${counterSymbol}`)
      })

      watcher.on('data', async (response) => {
        if (response.type === RESPONSE_TYPES.EXISTING_EVENTS_DONE) {
          return resolve()
        }

        if (![RESPONSE_TYPES.EXISTING_EVENT, RESPONSE_TYPES.NEW_EVENT].includes(response.type)) {
          // No other responses are implemented
          return
        }

        const event = new MarketEvent(response.martketEvent)
        store.put(event.key, event.value)
      })
    })
  }

  async healthCheck (params) {
    const deadline = grpcDeadline()

    return new Promise((resolve, reject) => {
      this.health.check(params, { deadline }, (err, res) => {
        if (err) return reject(err)
        return resolve(res)
      })
    })
  }
}

// gRPC uses the term `deadline` which is a timeout feature that is an absolute
// point in time, instead of a duration.
function grpcDeadline (timeoutInSeconds = 5) {
  new Date().setSeconds(new Date().getSeconds() + timeoutInSeconds)
}

module.exports = RelayerClient
