const grpc = require('grpc')
const path = require('path')
const { readFileSync } = require('fs')

const AdminService = require('./admin-service')
const OrderService = require('./order-service')
const OrderBookService = require('./orderbook-service')
const WalletService = require('./wallet-service')

const { createBasicAuth, createHttpServer } = require('../utils')

/**
 * @constant
 * @type {string}
 * @default
 */
const BROKER_PROTO_PATH = './broker-daemon/proto/broker.proto'

/**
 * @class User-facing gRPC server for controling the BrokerDaemon
 *
 * @author Sparkswap
 */
class BrokerRPCServer {
  /**
   * @param {Object} opts
   * @param {Logger} opts.logger
   * @param {Map<string, Engine>} opts.engines
   * @param {RelayerClient} opts.relayer
   * @param {BlockOrderWorker} opts.blockOrderWorker
   * @param {Map<Orderbook>} opts.orderbooks
   * @param {string} opts.privKeyPath - Path to private key for broker rpc
   * @param {string} opts.pubKeyPath - Path to public key for broker rpc
   * @param {boolean} [opts.disableAuth=false]
   */
  constructor ({ logger, engines, relayer, blockOrderWorker, orderbooks, pubKeyPath, privKeyPath, disableAuth = false, enableCors = false, rpcUser = null, rpcPass = null, rpcHttpProxyAddress, rpcAddress } = {}) {
    this.logger = logger
    this.engines = engines
    this.relayer = relayer
    this.blockOrderWorker = blockOrderWorker
    this.orderbooks = orderbooks
    this.pubKeyPath = pubKeyPath
    this.privKeyPath = privKeyPath
    this.disableAuth = disableAuth
    this.auth = createBasicAuth(rpcUser, rpcPass, disableAuth)
    this.rpcHttpProxyAddress = rpcHttpProxyAddress
    this.rpcAddress = rpcAddress
    this.protoPath = path.resolve(BROKER_PROTO_PATH)

    this.server = new grpc.Server()
    this.httpServer = createHttpServer(this.protoPath, this.rpcAddress, { disableAuth, enableCors, privKeyPath, pubKeyPath, logger })

    this.adminService = new AdminService(this.protoPath, { logger, relayer, engines, orderbooks, auth: this.auth })
    this.server.addService(this.adminService.definition, this.adminService.implementation)

    this.orderService = new OrderService(this.protoPath, { logger, blockOrderWorker, auth: this.auth })
    this.server.addService(this.orderService.definition, this.orderService.implementation)

    this.orderBookService = new OrderBookService(this.protoPath, { logger, relayer, orderbooks, auth: this.auth })
    this.server.addService(this.orderBookService.definition, this.orderBookService.implementation)

    this.walletService = new WalletService(this.protoPath, { logger, engines, relayer, orderbooks, blockOrderWorker, auth: this.auth })
    this.server.addService(this.walletService.definition, this.walletService.implementation)
  }

  get rpcHttpProxyHost () {
    return this.rpcHttpProxyAddress.split(':')[0]
  }

  get rpcHttpProxyPort () {
    return this.rpcHttpProxyAddress.split(':')[1]
  }

  /**
   * Binds a given rpc address for our gRPC server
   *
   * @param {string} host
   * @returns {void}
   */
  listen (host) {
    if (global.sparkswap.network === 'mainnet' && this.disableAuth) {
      throw new Error(`Cannot disable TLS on mainnet. Set DISABLE_AUTH to FALSE.`)
    }

    const rpcCredentials = this.createCredentials()
    this.server.bind(host, rpcCredentials)
    this.server.start()

    this.httpServer.listen(this.rpcHttpProxyPort, this.rpcHttpProxyHost, () => {
      const protocol = this.disableAuth ? 'http' : 'https'
      this.logger.info(`Listening on ${protocol}://${this.rpcHttpProxyAddress}`)
    })
  }

  /**
   * Creates gRPC server credentials for the broker rpc server
   *
   * @returns {Object} grpc credentials
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
