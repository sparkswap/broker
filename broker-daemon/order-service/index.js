const { GrpcUnaryMethod } = require('grpc-methods')
const { loadProto } = require('../utils')

const createOrder = require('./create-order')

class OrderService {
  constructor (protoPath, { logger, relayer, orderbooks }) {
    this.protoPath = protoPath
    this.proto = loadProto(this.protoPath)
    this.logger = logger

    this.definition = this.proto.Order.service
    this.serviceName = 'Order'

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
