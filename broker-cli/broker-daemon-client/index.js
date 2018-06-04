const path = require('path')
const caller = require('grpc-caller')

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
 * @type {Object<key, String>}
 * @default
 */
const GRPC_SERVICES = {
  ADMIN_SERVICE: 'AdminService',
  ORDER_SERVICE: 'OrderService',
  ORDER_BOOK_SERVICE: 'OrderBookService',
  WALLET_SERVICE: 'WalletService'
}

/**
 * @constant
 * @type {Object<key, Boolean>}
 * @default
 */
const GRPC_OPTIONS = {
  convertFieldsToCamelCase: true,
  binaryAsBase64: true,
  longsAsStrings: true
}

class BrokerDaemonClient {
  /**
   * @param {String} address grpc host address
   */
  constructor (address) {
    this.address = address || BROKER_DAEMON_HOST || 'localhost:27492'
    this.options = GRPC_OPTIONS

    // TODO: Change this to use npm instead of a relative path to the daemon
    // TODO: we will need to add auth for daemon for a non-local address
    this.adminService = caller(this.address, PROTO_PATH, GRPC_SERVICES.ADMIN_SERVICE)
    this.orderService = caller(this.address, PROTO_PATH, GRPC_SERVICES.ORDER_SERVICE)
    this.orderBookService = caller(this.address, PROTO_PATH, GRPC_SERVICES.ORDER_BOOK_SERVICE)
    this.walletService = caller(this.address, PROTO_PATH, GRPC_SERVICES.WALLET_SERVICE)
  }
}

module.exports = BrokerDaemonClient
