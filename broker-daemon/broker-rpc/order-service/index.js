const { GrpcUnaryMethod } = require('grpc-methods')
const { loadProto } = require('../../utils')

const createBlockOrder = require('./create-block-order')
const getBlockOrder = require('./get-block-order')
const cancelBlockOrder = require('./cancel-block-order')
const getBlockOrders = require('./get-block-orders')

class OrderService {
  /**
   * @param {String} protoPath
   * @param {Object} opts
   * @param {Object} opts.logger
   * @param {BlockOrderWorker} opts.blockOrderWorker
   * @param {Function} opts.basicAuth
   */
  constructor (protoPath, { logger, blockOrderWorker, basicAuth }) {
    this.protoPath = protoPath
    this.proto = loadProto(this.protoPath)
    this.logger = logger

    this.definition = this.proto.OrderService.service
    this.serviceName = 'OrderService'

    const {
      CreateBlockOrderResponse,
      TimeInForce,
      GetBlockOrderResponse,
      GetBlockOrdersResponse
    } = this.proto

    this.implementation = {
      createBlockOrder: new GrpcUnaryMethod(createBlockOrder, this.messageId('createBlockOrder'), { logger, blockOrderWorker }, { CreateBlockOrderResponse, TimeInForce }, basicAuth).register(),
      getBlockOrder: new GrpcUnaryMethod(getBlockOrder, this.messageId('getBlockOrder'), { logger, blockOrderWorker }, { GetBlockOrderResponse }, basicAuth).register(),
      cancelBlockOrder: new GrpcUnaryMethod(cancelBlockOrder, this.messageId('cancelBlockOrder'), { logger, blockOrderWorker }, basicAuth).register(),
      getBlockOrders: new GrpcUnaryMethod(getBlockOrders, this.messageId('getBlockOrders'), { logger, blockOrderWorker }, { GetBlockOrdersResponse }, basicAuth).register()
    }
  }

  messageId (methodName) {
    return `[${this.serviceName}:${methodName}]`
  }
}

module.exports = OrderService
