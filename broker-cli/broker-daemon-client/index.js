const path = require('path')
const grpc = require('grpc')
const caller = require('grpc-caller')
const { readFileSync } = require('fs')

const CONFIG = require('./config')
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

class BrokerDaemonClient {
  /**
   * @param {String} address grpc host address
   */
  constructor (rpcAddress) {
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
    this.address = rpcAddress || CONFIG.rpcAddress
    this.certPath = CONFIG.rpcCert
    this.disableSsl = CONFIG.disableSsl
    this.cert = readFileSync(this.certPath)

    const [host, port] = this.address.split(':')

    // Set a default port if the port is not specified
    if (!port) {
      this.address = `${host}:${DEFAULT_RPC_PORT}`
    }

    this.proto = loadProto(PROTO_PATH)
    this.sslCredentials = grpc.credentials.createSsl(readFileSync(this.certPath))

    this.adminService = caller(this.address, this.proto.AdminService)
    this.orderService = caller(this.address, this.proto.OrderService)
    this.orderBookService = caller(this.address, this.proto.OrderBookService)
    this.walletService = caller(this.address, this.proto.WalletService, 'WalletService', this.sslCredentials)
  }
}

module.exports = BrokerDaemonClient
