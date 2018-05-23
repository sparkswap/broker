const { GrpcServerStreamingMethod, loadProto } = require('grpc-methods')

const watchMarket = require('./watch-market')

class OrderBookService {
  constructor (protoPath, { logger, relayer, orderbooks }) {
    this.protoPath = protoPath
    this.proto = loadProto(this.protoPath)
    this.logger = logger

    this.definition = this.proto.OrderBook.service
    this.serviceName = 'OrderBook'

    const {
      WatchMarketResponse
    } = this.proto

    this.implementation = {
      watchMarket: new GrpcServerStreamingMethod(watchMarket, this.messageId('watchMarket'), { logger, relayer, orderbooks }, { WatchMarketResponse }).register()
    }
  }

  messageId (methodName) {
    return `[${this.serviceName}:${methodName}]`
  }
}

module.exports = OrderBookService
