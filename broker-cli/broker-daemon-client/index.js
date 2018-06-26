const path = require('path')
const caller = require('grpc-caller')
const CONFIG = require('./config')
const { loadProto } = require('../utils')

/**
 * @constant
 * @type {String}
 * @default
 */
const PROTO_PATH = path.resolve('../proto/broker.proto')

class BrokerDaemonClient {
  /**
   * @param {String} address grpc host address
   */
  constructor (address) {
    /**
     * Broker Daemon grpc host address
     * If not set, defaults to the user settings at ~/.kcli.js
     * or the installation settings at ../kcli.js
     * @type {String}
     */
    this.address = address || CONFIG.rpcAddress
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
