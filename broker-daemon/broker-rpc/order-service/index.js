const { GrpcUnaryMethod } = require('grpc-methods')
const { loadProto } = require('../../utils')

const createOrder = require('./create-order')
const createBlockOrder = require('./create-block-order')
const getBlockOrder = require('./get-block-order')
const cancelBlockOrder = require('./cancel-block-order')
const getBlockOrders = require('./get-block-orders')
const cancelAllBlockOrders = require('./cancel-all-block-orders')
const getTradeHistory = require('./get-trade-history')

/** @typedef {import('../broker-rpc-server').BlockOrderWorker} BlockOrderWorker */
/** @typedef {import('../../relayer')} RelayerClient */
/** @typedef {import('level-sublevel')} Sublevel */

class OrderService {
  /**
   * @param {string} protoPath
   * @param {object} opts
   * @param {object} opts.logger
   * @param {RelayerClient} opts.relayer
   * @param {BlockOrderWorker} opts.blockOrderWorker
   * @param {Sublevel} opts.store
   * @param {Function} opts.auth
   */
  constructor (protoPath, { logger, relayer, blockOrderWorker, auth, store }) {
    this.protoPath = protoPath
    this.proto = loadProto(this.protoPath)
    this.logger = logger

    this.definition = this.proto.broker.rpc.OrderService.service
    this.serviceName = 'OrderService'

    const {
      TimeInForce
    } = this.proto.broker.rpc

    this.implementation = {
      createBlockOrder: new GrpcUnaryMethod(createBlockOrder, this.messageId('createBlockOrder'), { logger, blockOrderWorker, auth }, { TimeInForce }).register(),
      getBlockOrder: new GrpcUnaryMethod(getBlockOrder, this.messageId('getBlockOrder'), { logger, blockOrderWorker, auth }).register(),
      cancelBlockOrder: new GrpcUnaryMethod(cancelBlockOrder, this.messageId('cancelBlockOrder'), { logger, blockOrderWorker, auth }).register(),
      getBlockOrders: new GrpcUnaryMethod(getBlockOrders, this.messageId('getBlockOrders'), { logger, blockOrderWorker, auth }).register(),
      cancelAllBlockOrders: new GrpcUnaryMethod(cancelAllBlockOrders, this.messageId('cancelAllBlockOrders'), { logger, blockOrderWorker, auth }).register(),
      getTradeHistory: new GrpcUnaryMethod(getTradeHistory, this.messageId('getTradeHistory'), { logger, blockOrderWorker, auth }).register(),
      createOrder: new GrpcUnaryMethod(createOrder, this.messageId('createOrder'), { logger, relayer, auth, store }).register()
    }
  }

  messageId (methodName) {
    return `[${this.serviceName}:${methodName}]`
  }
}

module.exports = OrderService
