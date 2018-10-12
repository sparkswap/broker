const path = require('path')
const { readFileSync } = require('fs')
const { credentials } = require('grpc')
const caller = require('grpc-caller')

const Identity = require('./identity')

const { MarketEvent } = require('../models')
const { loadProto, migrateStore } = require('../utils')

const consoleLogger = console
consoleLogger.debug = console.log.bind(console)

/**
 * @constant
 * @type {String}
 * @default
 */
const RELAYER_PROTO_PATH = './proto/relayer.proto'

/**
 * Interface for daemon to interact with a SparkSwap Relayer
 *
 * @author SparkSwap
 */
class RelayerClient {
  /**
   * @typedef {Object} KeyPath
   * @property {String} privKeyPath Path to a private key
   * @property {String} pubKeyPath  Path to the public key corresponding to the private key
   */

  /**
   * @param {KeyPath} idKeyPath            Path to public and private key for the broker's identity
   * @param {Object}  relayerOpts
   * @param {String}  relayerOpts.host     Hostname and port of the Relayer RPC server
   * @param {String}  relayerOpts.certPath Absolute path to the root certificate for the Relayer
   * @param {Logger}  logger
   */
  constructor ({ privKeyPath, pubKeyPath }, { certPath, host = 'localhost:28492' }, logger = consoleLogger) {
    this.logger = logger
    this.address = host
    this.proto = loadProto(path.resolve(RELAYER_PROTO_PATH))

    this.identity = Identity.load(privKeyPath, pubKeyPath)
    const channelCredentials = credentials.createSsl(readFileSync(certPath))
    // `service_url` in the line below is defined by the grpc lib, so we need to tell eslint to ignore snake case
    // eslint-disable-next-line
    const callCredentials = credentials.createFromMetadataGenerator(({ service_url }, callback) => {
      callback(null, this.identity.identify())
    })
    this.credentials = credentials.combineChannelCredentials(channelCredentials, callCredentials)

    this.makerService = caller(this.address, this.proto.MakerService, this.credentials)
    this.takerService = caller(this.address, this.proto.TakerService, this.credentials)
    this.healthService = caller(this.address, this.proto.HealthService, this.credentials)
    this.orderbookService = caller(this.address, this.proto.OrderBookService, this.credentials)
    this.paymentChannelNetworkService = caller(this.address, this.proto.PaymentChannelNetworkService, this.credentials)
    this.infoService = caller(this.address, this.proto.InfoService, this.credentials)
  }

  /**
   * Opens a stream with the exchange to watch for market events
   *
   * @param {LevelUP} store
   * @param {Object} params
   * @param {String} params.baseSymbol
   * @param {String} params.counterSymbol
   * @param {String} params.lastUpdated - nanosecond timestamp
   * @param {String} params.sequence
   * @returns {Promise<void>} a promise that resolves when the market is up to date with the remote relayer
   */
  watchMarket (store, { baseSymbol, counterSymbol, lastUpdated, sequence }) {
    const RESPONSE_TYPES = this.proto.WatchMarketResponse.ResponseType

    const params = {
      baseSymbol,
      counterSymbol,
      lastUpdated,
      sequence
    }

    return new Promise(async (resolve, reject) => {
      this.logger.info('Setting up market watcher', params)

      try {
        const watcher = this.orderbookService.watchMarket(params)

        // We set this value to be a promise when we are migrating the database.
        // if we were to continue processing before deletion is finished, we could
        // inadvertently delete new events added to the store.
        let migrating

        watcher.on('end', () => {
          this.logger.error('Remote ended stream', params)
          // TODO: retry stream?
          throw new Error(`Remote relayer ended stream for ${baseSymbol}/${counterSymbol}`)
        })

        watcher.on('data', async (response) => {
          // migrating is falsey (undefined) by default
          if (migrating) {
            this.logger.debug(`Waiting for migration to finish before acting on new response`)
            await migrating
          }

          this.logger.debug(`response type is ${response.type}`)
          if (RESPONSE_TYPES[response.type] === RESPONSE_TYPES.EXISTING_EVENTS_DONE) {
            this.logger.debug(`Resolving because response type is: ${response.type}`)
            return resolve()
          }

          if (RESPONSE_TYPES[response.type] === RESPONSE_TYPES.START_OF_EVENTS) {
            this.logger.debug(`Removing existing orderbook events because response type is: ${response.type}`)

            // this deletes every event in the store, and makes `migrating` a promise
            // that resolves when deletion is complete, allowing other events to be processed.
            migrating = migrateStore(store, store, (key) => { return { type: 'del', key } })
            return
          }

          if (![RESPONSE_TYPES.EXISTING_EVENT, RESPONSE_TYPES.NEW_EVENT].includes(RESPONSE_TYPES[response.type])) {
            return this.logger.debug(`Returning because response type is: ${response.type}`)
          }

          const { marketEvent } = response

          this.logger.debug('Creating a market event', marketEvent)

          const { key, value } = new MarketEvent(marketEvent)
          store.put(key, value)
        })

        watcher.on('error', (err) => {
          this.logger.error('Relayer watchMarket grpc failed', err)
          process.exit(1)
          reject(err)
        })
      // NOTE: This catch will NOT handle any errors that are thrown inside of `watcher`
      // events. You must reject the promise in order to bubble-up any exceptions
      } catch (e) {
        this.logger.error('Error encountered while setting up stream')
        return reject(e)
      }
    })
  }
}

module.exports = RelayerClient
