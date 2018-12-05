const path = require('path')
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
   * @param {String} [rpcAddress=null] - grpc host address
   */
  constructor (rpcAddress = null) {
    this.config = loadConfig()

    /**
     * Broker Daemon grpc host address
     *
     * If not set, defaults to the user settings at ~/.sparkswap.js
     * or the installation settings at ../sparkswap.js
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
      console.warn('\n`disableAuth` is set to true. The CLI will try to connect to the daemon without SSL/TLS\n'.yellow)
      this.credentials = grpc.credentials.createInsecure()
    } else {
      if (!this.username) throw new Error('No username is specified for authentication')
      if (!this.password) throw new Error('No password is specified for authentication')

      // Go back to the ./broker-cli/certs directory from the current directory
      this.cert = readFileSync(path.join(PROJECT_ROOT, this.certPath))

      const channelCredentials = grpc.credentials.createSsl(this.cert)
      const callCredentials = basicAuth.generateBasicAuthCredentials(this.username, this.password)

      this.credentials = grpc.credentials.combineChannelCredentials(channelCredentials, callCredentials)
    }

    this.adminService = caller(this.address, this.proto.broker.rpc.AdminService, this.credentials)
    this.orderService = caller(this.address, this.proto.broker.rpc.OrderService, this.credentials)
    this.orderBookService = caller(this.address, this.proto.broker.rpc.OrderBookService, this.credentials)
    this.walletService = caller(this.address, this.proto.broker.rpc.WalletService, this.credentials)
    this.infoService = caller(this.address, this.proto.broker.rpc.InfoService, this.credentials)
  }
}

module.exports = BrokerDaemonClient
