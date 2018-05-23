const { GrpcUnaryMethod, loadProto } = require('grpc-methods')

const createOrder = require('./create-order')

class OrderService {
  constructor (protoPath, { logger, relayer, orderbooks }) {
    this.protoPath = protoPath
    this.proto = loadProto(this.protoPath)
    this.logger = logger

    this.definition = this.proto.OrderService.service
    this.serviceName = 'OrderService'

    const {
      CreateOrderResponse,
      TimeInForce
    } = this.proto

    this.implementation = {
      createOrder: new GrpcUnaryMethod(createOrder, this.messageId('createOrder'), { logger, relayer, orderbooks }, { CreateOrderResponse, TimeInForce }).register()
    }
  }

  messageId (methodName) {
    return `[${this.serviceName}:${methodName}]`
  }
}

module.exports = OrderService
