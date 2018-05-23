const { GrpcUnaryMethod, loadProto } = require('grpc-methods')

const createBlockOrder = require('./create-block-order')

class OrderService {
  constructor (protoPath, { logger, blockOrderWorker }) {
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
      createBlockOrder: new GrpcUnaryMethod(createBlockOrder, this.messageId('createBlockOrder'), { logger, blockOrderWorker }, { CreateBlockOrderResponse, TimeInForce }).register()
    }
  }

  messageId (methodName) {
    return `[${this.serviceName}:${methodName}]`
  }
}

module.exports = OrderService
