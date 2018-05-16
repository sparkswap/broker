const { GrpcUnaryMethod, GrpcServerStreamingMethod, loadProto } = require('grpc-methods')

const createOrder = require('./create-order')
const watchMarket = require('./watch-market')
const healthCheck = require('./health-check')

class BrokerService {
  constructor (protoPath, { logger, relayer, orderbooks }) {
    this.protoPath = protoPath
    this.proto = loadProto(this.protoPath)
    this.logger = logger

    this.definition = this.proto.Broker.service
    this.serviceName = 'Broker'

    const {
      CreateOrderResponse,
      WatchMarketResponse,
      HealthCheckResponse,
      Side,
      TimeInForce
    } = this.proto

    this.implementation = {
      createOrder: new GrpcUnaryMethod(createOrder, this.messageId('createOrder'), { logger, relayer, orderbooks }, { CreateOrderResponse, Side, TimeInForce }).register(),
      watchMarket: new GrpcServerStreamingMethod(watchMarket, this.messageId('watchMarket'), { logger, relayer }, { WatchMarketResponse }).register(),
      healthCheck: new GrpcUnaryMethod(healthCheck, this.messageId('healthCheck'), { logger, relayer }, { HealthCheckResponse }).register()
    }
  }

  messageId (methodName) {
    return `[${this.serviceName}:${methodName}]`
  }
}

module.exports = BrokerService
