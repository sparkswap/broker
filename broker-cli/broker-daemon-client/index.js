const path = require('path')
const caller = require('grpc-caller')
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

class BrokerDaemonClient {
  /**
   * @param {String} address - grpc host address
   */
  constructor (rpcAddress) {
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

    const [host, port] = this.address.split(':')

    // Set a default port if a TLD is used
    if (!port) {
      this.address = `${host}:${DEFAULT_RPC_PORT}`
    }

    this.proto = loadProto(PROTO_PATH)

    // TODO: Change this to use npm instead of a relative path to the daemon
    // TODO: we will need to add auth for daemon for a non-local address
    this.adminService = caller(this.address, this.proto.AdminService)
    this.orderService = caller(this.address, this.proto.OrderService)
    this.orderBookService = caller(this.address, this.proto.OrderBookService)
    this.walletService = caller(this.address, this.proto.WalletService)
  }
}

module.exports = BrokerDaemonClient
