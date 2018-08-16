const { GrpcServerStreamingMethod } = require('grpc-methods')
const { loadProto } = require('../../utils')

const watchMarket = require('./watch-market')

class OrderBookService {
  /**
   * @param {String} protoPath
   * @param {Object} opts
   * @param {Object} opts.logger
   * @param {RelayerClient} opts.relayer
   * @param {Map} opts.orderbooks
   * @param {Function} opts.basicAuth
   */
  constructor (protoPath, { logger, relayer, orderbooks, basicAuth }) {
    this.protoPath = protoPath
    this.proto = loadProto(this.protoPath)
    this.logger = logger

    this.definition = this.proto.OrderBookService.service
    this.serviceName = 'OrderBookService'

    const {
      WatchMarketResponse
    } = this.proto

    this.implementation = {
      watchMarket: new GrpcServerStreamingMethod(watchMarket, this.messageId('watchMarket'), { logger, relayer, orderbooks }, { WatchMarketResponse }, basicAuth).register()
    }
  }

  messageId (methodName) {
    return `[${this.serviceName}:${methodName}]`
  }
}

module.exports = OrderBookService
