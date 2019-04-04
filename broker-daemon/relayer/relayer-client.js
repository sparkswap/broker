const path = require('path')
const { readFileSync } = require('fs')
const { credentials } = require('grpc')
const caller = require('grpc-caller')

const Identity = require('./identity')
const MarketWatcher = require('./market-watcher')

const { loadProto } = require('../utils')
const { grpcDeadlineInterceptor } = require('../../broker-cli/utils')

const consoleLogger = console
consoleLogger.debug = console.log.bind(console)

/**
 * Path for the Proto files for the Relayer
 * @type {string}
 * @constant
 * @default
 */
const RELAYER_PROTO_PATH = './proto/relayer.proto'

/**
 * @constant
 * @type {string}
 * @default
 */
const PRODUCTION = process.env.NODE_ENV === 'production'

/**
 * gRPC service options for any streaming calls on the relayer. This configuration
 * provides "keep-alive" functionality so that stream calls will not be prematurely
 * cancelled, leaving the broker in an offline/weird state where communication
 * is dead, but the broker hasn't been notified
 *
 * NOTE: This object will be mutated by gRPC (do not use Object.freeze)
 *
 * @constant
 * @type {Object}
 * @default
 */
const GRPC_STREAM_OPTIONS = {
  // Set to 30 seconds, keep-alive time is an arbitrary number, but needs to be
  // less than default tcp timeout of AWS/ELB which is 1 minute
  'grpc.keepalive_time_ms': 30000,
  // Set to true. We want to send keep-alive pings even if the stream is not in use
  'grpc.keepalive_permit_without_calls': 1,
  //  Set to 30 seconds, Minimum time between sending successive ping frames
  // without receiving any data frame
  'grpc.http2.min_time_between_pings_ms': 30000,
  // Set to infinity, this means the server will continually send keep-alive pings
  'grpc.http2.max_pings_without_data': 0
}

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

    if (!PRODUCTION) {
      logger.info('Using local certs for relayer client', { production: PRODUCTION })
      channelCredentials = credentials.createSsl(readFileSync(certPath))
    }

    this.credentials = channelCredentials

    const makerServiceClient = new this.proto.MakerService(this.address, this.credentials, GRPC_STREAM_OPTIONS)
    this.makerService = caller.wrap(makerServiceClient, {}, { interceptors: [grpcDeadlineInterceptor] })

    const takerServiceClient = new this.proto.TakerService(this.address, this.credentials, GRPC_STREAM_OPTIONS)
    this.takerService = caller.wrap(takerServiceClient, {}, { interceptors: [grpcDeadlineInterceptor] })

    const orderBookServiceClient = new this.proto.OrderBookService(this.address, this.credentials, GRPC_STREAM_OPTIONS)
    this.orderBookService = caller.wrap(orderBookServiceClient, {}, { interceptors: [grpcDeadlineInterceptor] })

    const paymentChannelNetworkServiceClient = new this.proto.PaymentChannelNetworkService(this.address, this.credentials)
    this.paymentChannelNetworkService = caller.wrap(paymentChannelNetworkServiceClient, {}, { interceptors: [grpcDeadlineInterceptor] })

    const adminServiceClient = new this.proto.AdminService(this.address, this.credentials)
    this.adminService = caller.wrap(adminServiceClient, {}, { interceptors: [grpcDeadlineInterceptor] })
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
