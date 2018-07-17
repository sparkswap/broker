const grpc = require('grpc')
const path = require('path')

const AdminService = require('./admin-service')
const OrderService = require('./order-service')
const OrderBookService = require('./orderbook-service')
const WalletService = require('./wallet-service')

/**
 * @constant
 * @type {String}
 * @default
 */
const BROKER_PROTO_PATH = './broker-daemon/proto/broker.proto'

/**
 * @class User-facing gRPC server for controling the BrokerDaemon
 *
 * @author kinesis
 */
class BrokerRPCServer {
  /**
   * @param  {Logger}           opts.logger
   * @param  {Engine}           opts.engine
   * @param  {RelayerClient}    opts.relayer
   * @param  {BlockOrderWorker} opts.blockOrderWorker
   * @param  {Map<Orderbook>}   opts.orderbooks
   * @return {BrokerRPCServer}
   */
  constructor ({ logger, engines, engine, relayer, blockOrderWorker, orderbooks } = {}) {
    this.logger = logger
    this.engine = engine
    this.engines = engines
    this.relayer = relayer
    this.blockOrderWorker = blockOrderWorker
    this.orderbooks = orderbooks

    this.protoPath = path.resolve(BROKER_PROTO_PATH)

    this.server = new grpc.Server()

    this.adminService = new AdminService(this.protoPath, { logger, relayer, engine, engines })
    this.server.addService(this.adminService.definition, this.adminService.implementation)

    this.orderService = new OrderService(this.protoPath, { logger, blockOrderWorker })
    this.server.addService(this.orderService.definition, this.orderService.implementation)

    this.orderBookService = new OrderBookService(this.protoPath, { logger, relayer, orderbooks })
    this.server.addService(this.orderBookService.definition, this.orderBookService.implementation)

    this.walletService = new WalletService(this.protoPath, { logger, engines, relayer })
    this.server.addService(this.walletService.definition, this.walletService.implementation)
  }

  /**
   * Binds a given rpc address for our grpc server
   *
   * @param {String} host
   * @returns {void}
   */
  listen (host) {
    this.server.bind(host, grpc.ServerCredentials.createInsecure())
    this.server.start()
  }
}

module.exports = BrokerRPCServer
