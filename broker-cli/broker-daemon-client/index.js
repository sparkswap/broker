const path = require('path')
const grpc = require('grpc')
const caller = require('grpc-caller')
const { readFileSync } = require('fs')

const { loadConfig } = require('./config')
const { loadProto } = require('../utils')

/**
 * @constant
 * @type {String}
 * @default
 */
const PROTO_PATH = path.resolve(__dirname, '..', 'proto', 'broker.proto')

/**
 * @constant
 * @type {Number}
 * @default
 */
const DEFAULT_RPC_PORT = 27492

/**
 * Root path from the current module used to resolve cert file paths
 * @constant
 * @type {String}
 * @default
 */
const PROJECT_ROOT_DIR = '../'

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
    this.disableSsl = this.config.disableSsl

    const [host, port] = this.address.split(':')

    // Set a default port if the port is not specified
    if (!port) {
      this.address = `${host}:${DEFAULT_RPC_PORT}`
    }

    this.proto = loadProto(PROTO_PATH)

    if (this.disableSsl) {
      // TODO: Eventually allow broker daemon client to use the cli's logger
      console.warn('disableSsl is set to true. The CLI will try to connect to the daemon without ssl')
      this.credentials = grpc.credentials.createInsecure()
    } else {
      // Go back to the ./broker-cli/certs directory from the current directory
      this.cert = readFileSync(path.join(__dirname, PROJECT_ROOT_DIR, this.certPath))
      this.credentials = grpc.credentials.createSsl(this.cert)
    }

    this.adminService = caller(this.address, this.proto.AdminService, this.credentials)
    this.orderService = caller(this.address, this.proto.OrderService, this.credentials)
    this.orderBookService = caller(this.address, this.proto.OrderBookService, this.credentials)
    this.walletService = caller(this.address, this.proto.WalletService, this.credentials)
  }
}

module.exports = BrokerDaemonClient
