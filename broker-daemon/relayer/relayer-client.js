const grpc = require('grpc')
const path = require('path')

const { MarketEvent } = require('../models')
const { loadProto, grpcDeadline } = require('../utils')

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
    this.maker = new this.proto.MakerService(this.address, grpc.credentials.createInsecure())
    this.orderbook = new this.proto.OrderBookService(this.address, grpc.credentials.createInsecure())
    this.health = new this.proto.HealthService(this.address, grpc.credentials.createInsecure())
    this.paymentNetwork = new this.proto.PaymentNetworkService(this.address, grpc.credentials.createInsecure())
  }

  /**
   * Creates an order on the relayer
   *
   * @param {Object} params
   * @returns {Promise}
   */
  createOrder (params) {
    const deadline = grpcDeadline()

    return new Promise((resolve, reject) => {
      this.maker.createOrder(params, { deadline }, (err, res) => {
        if (err) return reject(err)
        return resolve(res)
      })
    })
  }

  /**
   * Place an order on the Relayer
   * @param  {String} options.orderId                     Relayer-assigned unique identifier
   * @param  {String} options.feeRefundPaymentRequest     Lightning Network payment request to refund the paid fee in case of order cancellation
   * @param  {String} options.depositRefundPaymentRequest Lightning Network payment request to refund the deposit in case or cancellation or completion
   * @return {Promise<void>}
   */
  async placeOrder ({ orderId, feeRefundPaymentRequest, depositRefundPaymentRequest }) {
    const deadline = grpcDeadline()

    return new Promise((resolve, reject) => {
      this.maker.placeOrder({ orderId, feeRefundPaymentRequest, depositRefundPaymentRequest }, { deadline }, (err, res) => {
        if (err) return reject(err)
        return resolve()
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
    const RESPONSE_TYPES = this.proto.WatchMarketResponse.ResponseType

    const params = {
      baseSymbol,
      counterSymbol,
      // TODO: fix null value for lastUpdated
      lastUpdated: (lastUpdated || '0')
    }

    return new Promise(async (resolve, reject) => {
      this.logger.info('Setting up market watcher', params)

      try {
        const watcher = this.orderbook.watchMarket(params)

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
            return this.logger.info(`Returning because response type is: ${response.type}`)
          }

          this.logger.info(`Creating a market event: ${response.marketEvent}`)
          const { key, value } = new MarketEvent(response.marketEvent)
          store.put(key, value)
        })

        watcher.on('error', (err) => {
          this.logger.error('Relayer watchMarket grpc failed', err)
          reject(err)
        })
      } catch (e) {
        return reject(e)
      }
    })
  }

  /**
   * Checks the health of the relayer
   *
   * @param {Object} params
   * @returns {Promise}
   */
  healthCheck () {
    const deadline = grpcDeadline()

    return new Promise((resolve, reject) => {
      this.health.check({}, { deadline }, (err, res) => {
        if (err) return reject(err)
        return resolve(res)
      })
    })
  }

  getPublicKey () {
    return new Promise((resolve, reject) => {
      this.paymentNetwork.getPublicKey({}, { deadline: grpcDeadline() }, (err, res) => {
        if (err) return reject(err)
        return resolve(res)
      })
    })
  }
}

module.exports = RelayerClient
