const { GrpcServerStreamingMethod, GrpcUnaryMethod } = require('grpc-methods')
const { loadProto } = require('../../utils')

const watchMarket = require('./watch-market')
const getOrderbook = require('./get-orderbook')
const getSupportedMarkets = require('./get-supported-markets')
const getMarketStats = require('./get-market-stats')
const getTrades = require('./get-trades')

/** @typedef {import('../broker-rpc-server').RelayerClient} RelayerClient */
/** @typedef {import('../broker-rpc-server').Orderbook} Orderbook */

class OrderBookService {
  /**
   * @param {string} protoPath
   * @param {object} opts
   * @param {object} opts.logger
   * @param {RelayerClient} opts.relayer
   * @param {Map<string, Orderbook>} opts.orderbooks
   * @param {Function} opts.auth
   */
  constructor (protoPath, { logger, relayer, orderbooks, auth }) {
    this.protoPath = protoPath
    this.proto = loadProto(this.protoPath)
    this.logger = logger

    this.definition = this.proto.broker.rpc.OrderBookService.service
    this.serviceName = 'OrderBookService'

    const { EventType } = this.proto.broker.rpc.WatchMarketResponse

    this.implementation = {
      watchMarket: new GrpcServerStreamingMethod(watchMarket, this.messageId('watchMarket'), { logger, relayer, orderbooks, auth }, { EventType }).register(),
      getOrderbook: new GrpcUnaryMethod(getOrderbook, this.messageId('getOrderbook'), { logger, relayer, orderbooks, auth }).register(),
      getSupportedMarkets: new GrpcUnaryMethod(getSupportedMarkets, this.messageId('getSupportedMarkets'), { logger, relayer, orderbooks }).register(),
      getMarketStats: new GrpcUnaryMethod(getMarketStats, this.messageId('getMarketStats'), { logger, orderbooks }).register(),
      getTrades: new GrpcUnaryMethod(getTrades, this.messageId('getTrades'), { logger, relayer, orderbooks }).register()
    }
  }

  messageId (methodName) {
    return `[${this.serviceName}:${methodName}]`
  }
}

module.exports = OrderBookService
