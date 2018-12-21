const path = require('path')
const { readFileSync } = require('fs')
const { credentials } = require('grpc')
const caller = require('grpc-caller')

const Identity = require('./identity')
const MarketWatcher = require('./market-watcher')

const { loadProto } = require('../utils')

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
    let channelCredentials
    // TODO figure out a way for this check to not be in the application code
    if (process.env.NETWORK === 'mainnet') {
      channelCredentials = credentials.createSsl()
    } else {
      channelCredentials = credentials.createSsl(readFileSync(certPath))
    }
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
   * @returns {EventEmitter} An event emitter that emits `sync` when the market is up to date and `end` when the stream ends (by error or otherwise)
   */
  watchMarket (store, { baseSymbol, counterSymbol, lastUpdated, sequence }) {
    const RESPONSE_TYPES = this.proto.WatchMarketResponse.ResponseType
    const params = {
      baseSymbol,
      counterSymbol,
      lastUpdated,
      sequence
    }

    this.logger.info('Setting up market watcher', params)
    const watcher = this.orderbookService.watchMarket(params)

    return new MarketWatcher(watcher, store, RESPONSE_TYPES, this.logger)
  }
}

module.exports = RelayerClient
