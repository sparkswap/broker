const grpc = require('grpc')
const path = require('path')
const { readFileSync } = require('fs')

const AdminService = require('./admin-service')
const OrderService = require('./order-service')
const OrderBookService = require('./orderbook-service')
const WalletService = require('./wallet-service')
const InfoService = require('./info-service')

const { createBasicAuth, createHttpServer } = require('../utils')

/**
 * @constant
 * @type {String}
 * @default
 */
const BROKER_PROTO_PATH = './broker-daemon/proto/broker.proto'

/**
 * Whether we are starting this process in production based on the NODE_ENV
 *
 * @constant
 * @type {Boolean}
 * @default
 */
const IS_PRODUCTION = (process.env.NODE_ENV === 'production')

/**
 * Port for express httpserver to listen on
 *
 * @constant
 * @type {String}
 * @default
 */
const HTTP_PORT = '27592'

/**
 * Default host and port for the BrokerRPCServer to listen on
 *
 * @constant
 * @type {String}
 * @default
 */
const DEFAULT_RPC_ADDRESS = '0.0.0.0:27492'
/**
 * @class User-facing gRPC server for controling the BrokerDaemon
 *
 * @author SparkSwap
 */
class BrokerRPCServer {
  /**
   * @param {Object} opts
   * @param {Logger} opts.logger
   * @param {Map<String, Engine>} opts.engines
   * @param {RelayerClient} opts.relayer
   * @param {BlockOrderWorker} opts.blockOrderWorker
   * @param {Map<Orderbook>} opts.orderbooks
   * @param {String} opts.privKeyPath - Path to private key for broker rpc
   * @param {String} opts.pubKeyPath - Path to public key for broker rpc
   * @param {Boolean} [opts.disableAuth=false]
   * @return {BrokerRPCServer}
   */
  constructor ({ logger, engines, relayer, blockOrderWorker, orderbooks, pubKeyPath, privKeyPath, disableAuth = false, enableCors = false, rpcUser = null, rpcPass = null } = {}) {
    this.logger = logger
    this.engines = engines
    this.relayer = relayer
    this.blockOrderWorker = blockOrderWorker
    this.orderbooks = orderbooks
    this.pubKeyPath = pubKeyPath
    this.privKeyPath = privKeyPath
    this.disableAuth = disableAuth
    this.auth = createBasicAuth(rpcUser, rpcPass, disableAuth)

    this.protoPath = path.resolve(BROKER_PROTO_PATH)

    this.server = new grpc.Server()
    this.httpServer = createHttpServer(this.protoPath, DEFAULT_RPC_ADDRESS, { disableAuth, enableCors, privKeyPath, pubKeyPath, logger })

    this.adminService = new AdminService(this.protoPath, { logger, relayer, engines, auth: this.auth })
    this.server.addService(this.adminService.definition, this.adminService.implementation)

    this.orderService = new OrderService(this.protoPath, { logger, blockOrderWorker, auth: this.auth })
    this.server.addService(this.orderService.definition, this.orderService.implementation)

    this.orderBookService = new OrderBookService(this.protoPath, { logger, relayer, orderbooks, auth: this.auth })
    this.server.addService(this.orderBookService.definition, this.orderBookService.implementation)

    this.walletService = new WalletService(this.protoPath, { logger, engines, relayer, orderbooks, auth: this.auth })
    this.server.addService(this.walletService.definition, this.walletService.implementation)

    this.infoService = new InfoService(this.protoPath, { logger, engines, relayer, orderbooks })
    this.server.addService(this.infoService.definition, this.infoService.implementation)
  }

  /**
   * Binds a given rpc address for our grpc server
   *
   * @param {String} host
   * @returns {void}
   */
  listen (host) {
    if (IS_PRODUCTION && this.disableAuth) {
      throw new Error(`Cannot disable TLS in production. Set DISABLE_AUTH to FALSE.`)
    }

    const rpcCredentials = this.createCredentials()
    this.server.bind(host, rpcCredentials)
    this.server.start()

    this.httpServer.listen(HTTP_PORT, () => {
      const protocol = this.disableAuth ? 'http' : 'https'
      this.logger.info(`Listening on ${protocol}://0.0.0.0:${HTTP_PORT}`)
    })
  }

  /**
   * Creates grpc server credentials for the broker rpc server
   *
   * @return {grpc.Credentials}
   */
  createCredentials () {
    if (this.disableAuth) {
      this.logger.warn('DISABLE_AUTH is set to TRUE. Connections to the broker will be unencrypted. This is suitable only in development.')
      return grpc.ServerCredentials.createInsecure()
    }

    const key = readFileSync(this.privKeyPath)
    const cert = readFileSync(this.pubKeyPath)

    this.logger.debug(`Securing gRPC connections with TLS: key: ${this.privKeyPath}, cert: ${this.pubKeyPath}`)

    return grpc.ServerCredentials.createSsl(
      null, // no root cert needed for server credentials
      [{
        private_key: key,
        cert_chain: cert
      }],
      false // checkClientCertificate: false (we don't use client certs)
    )
  }
}

module.exports = BrokerRPCServer
