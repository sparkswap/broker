const grpc = require('grpc')
const path = require('path')
const ExternalPreimageService = require('./external-preimage-service')

/**
 * @constant
 * @type {string}
 * @default
 */
const PROTO_PATH = path.resolve(__dirname, 'rpc.proto')

/**
 * Interchain Router for retriving preimages from other payment channel networks
 *
 * @author Sparkswap
 */
class InterchainRouter {
  /**
   * Create a new Interchain Router instance
   * @param {Object} args
   * @param {SublevelIndex} args.ordersByHash - Index of orders for which we are the maker, indexed by their swap hash
   * @param {Object} args.logger
   * @param {Map<Symbol, Engine>} args.engines
   */
  constructor ({ ordersByHash, logger, engines }) {
    this.ordersByHash = ordersByHash
    this.logger = logger
    this.server = new grpc.Server()
    this.engines = engines
    this.externalPreimageService = new ExternalPreimageService(PROTO_PATH, { ordersByHash, logger, engines })
    this.server.addService(this.externalPreimageService.definition, this.externalPreimageService.implementation)
  }

  /**
   * Binds a given rpc address for our grpc server
   *
   * @param {string} host - Hostname and port to listen on
   * @returns {void}
   */
  listen (host) {
    this.server.bind(host, grpc.ServerCredentials.createInsecure())
    this.server.start()
  }
}

module.exports = InterchainRouter
