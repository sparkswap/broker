const grpc = require('grpc')
const path = require('path')

const { loadProto } = require('../utils')
const order = require('./order')
const orderbook = require('./orderbook')
const admin = require('./admin')
const wallet = require('./wallet')

const BROKER_DAEMON_PROTO_PATH = './broker-daemon/proto/broker.proto'
const BROKER_DAEMON_HOST = process.env.BROKER_DAEMON_HOST

/**
 * Interface between the cli and a specified Kinesis BrokerDaemon
 */
class BrokerDaemonClient {
  /**
   * @param {String} address - host address to broker daemon
   */
  constructor (address) {
    this.address = address || BROKER_DAEMON_HOST || 'localhost:27492'

    if (!this.address) throw new Error('Address has not been set for BrokerDaemonClient')

    this.proto = loadProto(path.resolve(BROKER_DAEMON_PROTO_PATH))
    this.adminService = new this.proto.AdminService(this.address, grpc.credentials.createInsecure())
    this.orderService = new this.proto.OrderService(this.address, grpc.credentials.createInsecure())
    this.orderBookService = new this.proto.OrderBookService(this.address, grpc.credentials.createInsecure())
    this.walletService = new this.proto.WalletService(this.address, grpc.credentials.createInsecure())

    Object.assign(this, order)
    Object.assign(this, orderbook)
    Object.assign(this, admin)
    Object.assign(this, wallet)
  }
}

module.exports = BrokerDaemonClient
