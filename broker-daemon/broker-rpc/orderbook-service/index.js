const { GrpcServerStreamingMethod, GrpcUnaryMethod } = require('grpc-methods')
const { loadProto } = require('../../utils')

const watchMarket = require('./watch-market')
const getOrderbook = require('./get-orderbook')

class OrderBookService {
  /**
   * @param {String} protoPath
   * @param {Object} opts
   * @param {Object} opts.logger
   * @param {RelayerClient} opts.relayer
   * @param {Map} opts.orderbooks
   * @param {Function} opts.auth
   */
  constructor (protoPath, { logger, relayer, orderbooks, auth }) {
    this.protoPath = protoPath
    this.proto = loadProto(this.protoPath)
    this.logger = logger

    this.definition = this.proto.broker.rpc.OrderBookService.service
    this.serviceName = 'OrderBookService'

    const {
      WatchMarketResponse,
      GetOrderbookResponse
    } = this.proto.broker.rpc

    this.implementation = {
      watchMarket: new GrpcServerStreamingMethod(watchMarket, this.messageId('watchMarket'), { logger, relayer, orderbooks, auth }, { WatchMarketResponse }).register(),
      getOrderbook: new GrpcUnaryMethod(getOrderbook, this.messageId('getOrderbook'), { logger, relayer, orderbooks, auth }, { GetOrderbookResponse }).register()
    }
  }

  messageId (methodName) {
    return `[${this.serviceName}:${methodName}]`
  }
}

module.exports = OrderBookService
