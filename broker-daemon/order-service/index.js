const { GrpcUnaryMethod } = require('grpc-methods')
const { loadProto } = require('../utils')

const createBlockOrder = require('./create-block-order')

class OrderService {
  constructor (protoPath, { logger, relayer, orderbooks }) {
    this.protoPath = protoPath
    this.proto = loadProto(this.protoPath)
    this.logger = logger

    this.definition = this.proto.Order.service
    this.serviceName = 'Order'

    const {
      CreateBlockOrderResponse,
      TimeInForce
    } = this.proto

    this.implementation = {
      createBlockOrder: new GrpcUnaryMethod(createBlockOrder, this.messageId('createBlockOrder'), { logger, relayer, orderbooks }, { CreateBlockOrderResponse, TimeInForce }).register()
    }
  }

  messageId (methodName) {
    return `[${this.serviceName}:${methodName}]`
  }
}

module.exports = OrderService
