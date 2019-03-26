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
 * gRPC server options that add keep-alive configuration for all streaming service
 * calls
 *
 * @constant
 * @type {Object}
 * @default
 */
const GRPC_SERVER_OPTIONS = Object.freeze({
  // keep-alive time is an arbitrary number, but needs to be less than default
  // timeout of AWS/ELB which is 1 minute
  'grpc.keepalive_time_ms': 30000,
  // Set to true. We want to send keep-alive pings even if the stream is not in use
  'grpc.keepalive_permit_without_calls': 1,
  // Set to infinity, this means the server will continually send keep-alive pings
  'grpc.http2.max_pings_without_data': 0
})

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
    this.server = new grpc.Server(GRPC_SERVER_OPTIONS)
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
