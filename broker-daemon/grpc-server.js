const grpc = require('grpc')

const { loadProto } = require('./utils')
const GrpcAction = require('./grpc-action')

const {
  createOrder,
  watchMarket
} = require('./broker-actions')

const BROKER_PROTO_PATH = './broker-daemon/proto/broker.proto'

/**
 * Abstract class for a grpc server
 *
 * @author kinesis
 */
class GrpcServer {
  constructor (logger) {
    this.logger = logger

    this.protoPath = BROKER_PROTO_PATH
    this.proto = loadProto(this.protoPath)

    this.server = new grpc.Server()
    this.action = new GrpcAction(this.logger)

    this.brokerService = this.proto.Broker.service

    this.server.addService(this.brokerService, {
      createOrder: createOrder.bind(this.action),
      watchMarket: watchMarket.bind(this.action)
    })
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

module.exports = GrpcServer
