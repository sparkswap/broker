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
 * @type {string}
 * @default
 */
const RELAYER_PROTO_PATH = './proto/relayer.proto'

/**
 * Interface for daemon to interact with a SparkSwap Relayer
 *
 * @author Sparkswap
 */
class RelayerClient {
  /**
   * @typedef {Object} KeyPath
   * @property {string} privKeyPath Path to a private key
   * @property {string} pubKeyPath  Path to the public key corresponding to the private key
   */

  /**
   * @param {KeyPath} idKeyPath            - Path to public and private key for the broker's identity
   * @param {Object}  relayerOpts
   * @param {string}  relayerOpts.host     - Hostname and port of the Relayer RPC server
   * @param {string}  relayerOpts.certPath - Absolute path to the root certificate for the Relayer
   * @param {Logger}  logger
   */
  constructor ({ privKeyPath, pubKeyPath }, { certPath, host = 'localhost:28492' }, logger = consoleLogger) {
    this.logger = logger
    this.address = host
    this.proto = loadProto(path.resolve(RELAYER_PROTO_PATH))

    this.identity = Identity.load(privKeyPath, pubKeyPath)

    let channelCredentials = credentials.createSsl()

    if (global.sparkswap.network === 'regtest' && global.sparkswap.env !== 'production') {
      logger.info('Using local certs for relayer client', { env: global.sparkswap.env, network: global.sparkswap.network })
      channelCredentials = credentials.createSsl(readFileSync(certPath))
    }

    this.credentials = channelCredentials

    this.makerService = caller(this.address, this.proto.MakerService, this.credentials)
    this.takerService = caller(this.address, this.proto.TakerService, this.credentials)
    this.orderBookService = caller(this.address, this.proto.OrderBookService, this.credentials)
    this.paymentChannelNetworkService = caller(this.address, this.proto.PaymentChannelNetworkService, this.credentials)
    this.adminService = caller(this.address, this.proto.AdminService, this.credentials)
  }

  /**
   * Opens a stream with the exchange to watch for market events
   *
   * @param {LevelUP} store
   * @param {Object} params
   * @param {string} params.baseSymbol
   * @param {string} params.counterSymbol
   * @param {string} params.lastUpdated - nanosecond timestamp
   * @param {string} params.sequence
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
    const watcher = this.orderBookService.watchMarket(params)

    return new MarketWatcher(watcher, store, RESPONSE_TYPES, this.logger)
  }
}

module.exports = RelayerClient
