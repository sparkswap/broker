const grpc = require('grpc')
const path = require('path')
const ExternalPreimageService = require('./external-preimage-service')

/**
 * @constant
 * @type {String}
 * @default
 */
const PROTO_PATH = path.resolve(__dirname, 'rpc.proto')

/**
 * Interchain Router for retriving preimages from other payment channel networks
 *
 * @author kinesis
 */
class InterchainRouter {
  /**
   * Create a new Interchain Router instance
   * @param  {Object} logger
   * @return {InterchainRouter}
   */
  constructor (logger) {
    this.logger = logger
    this.server = new grpc.Server()
    this.externalPreimageService = new ExternalPreimageService(PROTO_PATH, this)
    this.server.addService(this.externalPreimageService.definition, this.externalPreimageService.implementation)
  }

  /**
   * Binds a given rpc address for our grpc server
   *
   * @param {String} host Hostname and port to listen on
   * @returns {void}
   */
  listen (host) {
    this.server.bind(host, grpc.ServerCredentials.createInsecure())
    this.server.start()
  }
}

module.exports = InterchainRouter
