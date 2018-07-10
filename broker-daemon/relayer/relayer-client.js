const path = require('path')
const caller = require('grpc-caller')

const { MarketEvent } = require('../models')
const { loadProto } = require('../utils')

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
  constructor (host = 'localhost:28492', logger) {
    this.logger = logger || console
    this.address = host
    this.proto = loadProto(path.resolve(RELAYER_PROTO_PATH))

    // TODO: we will need to add auth for daemon for a non-local address
    this.makerService = caller(this.address, this.proto.MakerService)
    this.takerService = caller(this.address, this.proto.TakerService)
    this.healthService = caller(this.address, this.proto.HealthService)
    this.orderbookService = caller(this.address, this.proto.OrderBookService)
    this.paymentNetworkService = caller(this.address, this.proto.PaymentNetworkService)
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
        const watcher = this.orderbookService.watchMarket(params)

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

          this.logger.info('Creating a market event', response.marketEvent)
          const { key, value } = new MarketEvent(response.marketEvent)
          store.put(key, value)
        })

        watcher.on('error', (err) => {
          this.logger.error('Relayer watchMarket grpc failed', err)
          process.exit(1)
          reject(err)
        })
      } catch (e) {
        return reject(e)
      }
    })
  }
}

module.exports = RelayerClient
