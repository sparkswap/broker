const grpc = require('grpc')

const { loadProto } = require('./utils')
const RelayerClient = require('./relayer')
const GrpcAction = require('./grpc-action')
const Orderbook = require('./orderbook')
const {
  createOrder,
  watchMarket,
  healthCheck
} = require('./broker-actions')

const BROKER_PROTO_PATH = './broker-daemon/proto/broker.proto'

/**
 * Abstract class for a grpc server
 *
 * @author kinesis
 */
class GrpcServer {
  constructor (logger, store, eventHandler) {
    this.logger = logger
    this.store = store
    this.eventHandler = eventHandler

    this.protoPath = BROKER_PROTO_PATH
    this.proto = loadProto(this.protoPath)

    this.server = new grpc.Server()
    this.relayer = new RelayerClient()
    this.action = new GrpcAction(this.logger, this.store, this.relayer)

    this.brokerService = this.proto.Broker.service

    this.server.addService(this.brokerService, {
      createOrder: createOrder.bind(this.action),
      watchMarket: watchMarket.bind(this.action),
      healthCheck: healthCheck.bind(this.action)
    })

    this.orderbooks = {}
  }

  /**
   * Listens to the assigned markets
   *
   * @param {Array<String>} markets
   * @returns {Promise<void>} promise that resolves when markets are caught up to the remote
   */
  async initializeMarkets (markets) {
    return Promise.all(markets.map((marketName) => {
      return this.initializeMarket(marketName)
    }))
  }

  /**
   * Listens to the assigned market
   *
   * @param {String} marketName
   * @returns {Promise<void>} promise that resolves when market is caught up to the remote
   */
  async initializeMarket (marketName) {
    this.orderbooks[marketName] = new Orderbook(marketName, this.relayer, this.store.sublevel(marketName), this.logger)
    return this.orderbooks[marketName].initialize()
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
