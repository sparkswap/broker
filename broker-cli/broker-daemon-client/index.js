const path = require('path')
const os = require('os')
const grpc = require('grpc')
const caller = require('grpc-caller')
const { readFileSync } = require('fs')
require('colors')

const { loadConfig } = require('./config')
const {
  loadProto,
  basicAuth,
  grpcDeadlineInterceptor
} = require('../utils')

/**
 * Root path from the current module used to resolve cert file paths
 * @constant
 * @type {string}
 * @default
 */
const PROJECT_ROOT = path.resolve(__dirname, '..')

/**
 * @constant
 * @type {string}
 * @default
 */
const PROTO_PATH = path.join(PROJECT_ROOT, 'proto', 'broker.proto')

/**
 * @constant
 * @type {number}
 * @default
 */
const DEFAULT_RPC_PORT = 27492

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

class BrokerDaemonClient {
  /**
   * @param {string} [rpcAddress=null] - grpc host address
   */
  constructor (rpcAddress = null) {
    this.config = loadConfig()

    /**
     * Broker Daemon grpc host address
     *
     * If not set, defaults to the user settings at ~/.sparkswap/config.js
     * or the installation settings at ../config.js
     *
     * Port defaults to DEFAULT_RPC_PORT if tld is passed in
     *
     * @see {DEFAULT_RPC_PORT}
     * @type {String}
     */
    this.address = rpcAddress || this.config.rpcAddress
    this.certPath = this.config.rpcCertPath
    this.disableAuth = this.config.disableAuth
    this.username = this.config.rpcUser
    this.password = this.config.rpcPass

    const [host, port] = this.address.split(':')

    // Set a default port if the port is not specified
    if (!port) {
      this.address = `${host}:${DEFAULT_RPC_PORT}`
    }

    this.proto = loadProto(PROTO_PATH)

    if (this.disableAuth) {
      // TODO: Eventually allow broker daemon client to use the cli's logger
      console.warn('`disableAuth` is set to true. The CLI will try to connect to the daemon without SSL/TLS'.yellow)
      this.credentials = grpc.credentials.createInsecure()
    } else {
      if (!this.username) throw new Error('No username is specified for authentication')
      if (!this.password) throw new Error('No password is specified for authentication')

      // https://github.com/nodejs/node/issues/684 is still unresolved so we perform
      // our own tilde expansion to get the full file path
      let certPathParts = this.certPath.split(path.sep)
      if (certPathParts[0] === '~') {
        certPathParts[0] = os.homedir()
        this.cert = readFileSync(path.join(...certPathParts))
      } else {
        this.cert = readFileSync(this.certPath)
      }

      const channelCredentials = grpc.credentials.createSsl(this.cert)
      const callCredentials = basicAuth.generateBasicAuthCredentials(this.username, this.password)

      this.credentials = grpc.credentials.combineChannelCredentials(channelCredentials, callCredentials)
    }

    const adminServiceClient = new this.proto.broker.rpc.AdminService(this.address, this.credentials)
    this.adminService = caller.wrap(adminServiceClient, {}, { interceptors: [grpcDeadlineInterceptor] })

    const orderServiceClient = new this.proto.broker.rpc.OrderService(this.address, this.credentials)
    this.orderService = caller.wrap(orderServiceClient, {}, { interceptors: [grpcDeadlineInterceptor] })

    const orderBookServiceClient = new this.proto.broker.rpc.OrderBookService(this.address, this.credentials, GRPC_STREAM_OPTIONS)
    this.orderBookService = caller.wrap(orderBookServiceClient, {}, { interceptors: [grpcDeadlineInterceptor] })

    const walletServiceClient = new this.proto.broker.rpc.WalletService(this.address, this.credentials)
    this.walletService = caller.wrap(walletServiceClient, {}, { interceptors: [grpcDeadlineInterceptor] })
  }
}

module.exports = BrokerDaemonClient
