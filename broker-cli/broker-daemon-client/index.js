const path = require('path')
const caller = require('grpc-caller')

const { loadProto } = require('../utils')

/**
 * @constant
 * @type {String}
 * @default
 */
const PROTO_PATH = path.resolve('./broker-daemon/proto/broker.proto')

/**
 * @constant
 * @type {String}
 * @default
 */
const BROKER_DAEMON_HOST = process.env.BROKER_DAEMON_HOST

/**
 * @constant
 * @type {String}
 * @default
 */
const DEFAULT_BROKER_DAEMON_HOST = 'localhost:27492'

class BrokerDaemonClient {
  /**
   * @param {String} address grpc host address
   */
  constructor (address) {
    this.address = address || BROKER_DAEMON_HOST || DEFAULT_BROKER_DAEMON_HOST
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
