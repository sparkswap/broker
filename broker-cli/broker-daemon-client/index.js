const path = require('path')
const os = require('os')
const grpc = require('grpc')
const caller = require('grpc-caller')
const { readFileSync } = require('fs')
require('colors')

const { loadConfig } = require('./config')
const {
  loadProto,
  basicAuth
} = require('../utils')

/**
 * Root path from the current module used to resolve cert file paths
 * @constant
 * @type {String}
 * @default
 */
const PROJECT_ROOT = path.resolve(__dirname, '..')

/**
 * @constant
 * @type {String}
 * @default
 */
const PROTO_PATH = path.join(PROJECT_ROOT, 'proto', 'broker.proto')

/**
 * @constant
 * @type {Number}
 * @default
 */
const DEFAULT_RPC_PORT = 27492

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
      }
      const certPath = path.join(...certPathParts)
      this.cert = readFileSync(certPath)

      const channelCredentials = grpc.credentials.createSsl(this.cert)
      const callCredentials = basicAuth.generateBasicAuthCredentials(this.username, this.password)

      this.credentials = grpc.credentials.combineChannelCredentials(channelCredentials, callCredentials)
    }

    this.adminService = caller(this.address, this.proto.broker.rpc.AdminService, this.credentials)
    this.orderService = caller(this.address, this.proto.broker.rpc.OrderService, this.credentials)
    this.orderBookService = caller(this.address, this.proto.broker.rpc.OrderBookService, this.credentials)
    this.walletService = caller(this.address, this.proto.broker.rpc.WalletService, this.credentials)
  }
}

module.exports = BrokerDaemonClient
