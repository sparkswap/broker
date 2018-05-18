const grpc = require('grpc')
const path = require('path')

const { MarketEvent } = require('../models')
const { loadProto } = require('../utils')

/**
 * @todo Add this config to CLI
 * @constant
 * @type {String}
 * @default
 */
const EXCHANGE_RPC_HOST = process.env.EXCHANGE_RPC_HOST || 'localhost:28492'

/**
 * @constant
 * @type {String}
 * @default
 */
const RELAYER_PROTO_PATH = './proto/relayer.proto'

/**
 * Interface for daemon to interact with a Kinesis Relayer
 *
 * @author kinesis
 */
class RelayerClient {
  /**
   * @param {Logger} logger
   */
  constructor (logger) {
    this.logger = logger || console
    this.address = EXCHANGE_RPC_HOST
    this.proto = loadProto(path.resolve(RELAYER_PROTO_PATH))

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
      // TODO: fix null value for lastUpdated
      lastUpdated = lastUpdated || '0'

      const params = { baseSymbol, counterSymbol, lastUpdated }
      const RESPONSE_TYPES = this.proto.WatchMarketResponse.ResponseType

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
        this.logger.info(`response type is ${response.type}`)
        if (RESPONSE_TYPES[response.type] === RESPONSE_TYPES.EXISTING_EVENTS_DONE) {
          this.logger.info(`Resolving because response type is: ${response.type}`)
          return resolve()
        }

        if (![RESPONSE_TYPES.EXISTING_EVENT, RESPONSE_TYPES.NEW_EVENT].includes(RESPONSE_TYPES[response.type])) {
          this.logger.info(`Returning because response type is: ${response.type}`)

          // No other responses are implemented
          return
        }

        this.logger.info(`Creating a market event: ${response.marketEvent}`)
        const event = new MarketEvent(response.marketEvent)
        store.put(event.key, event.value)
      })
    })
  }

  /**
   * Checks the health of the relayer
   *
   * @param {Object} params
   * @returns {Promise}
   */
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

/**
 * gRPC uses the term `deadline` which is a timeout feature that is an absolute
 * point in time, instead of a duration.
 *
 * @param {Number} [timeoutInSeconds=5]
 * @return {Date}
 */
function grpcDeadline (timeoutInSeconds = 5) {
  new Date().setSeconds(new Date().getSeconds() + timeoutInSeconds)
}

module.exports = RelayerClient
