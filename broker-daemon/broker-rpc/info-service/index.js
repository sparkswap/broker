const { GrpcUnaryMethod } = require('grpc-methods')
const { loadProto } = require('../../utils')

const getSupportedMarkets = require('./get-supported-markets')
const getMarketStats = require('./get-market-stats')
const getTrades = require('./get-trades')

class InfoService {
  constructor (protoPath, { logger, relayer, orderbooks }) {
    this.protoPath = protoPath
    this.proto = loadProto(this.protoPath)
    this.logger = logger

    this.definition = this.proto.InfoService.service
    this.serviceName = 'InfoService'

    const {
      GetSupportedMarketsResponse,
      GetMarketStatsResponse,
      GetTradesResponse
    } = this.proto

    this.implementation = {
      getSupportedMarkets: new GrpcUnaryMethod(getSupportedMarkets, this.messageId('getSupportedMarkets'), { logger, relayer, orderbooks }, { GetSupportedMarketsResponse }).register(),
      getMarketStats: new GrpcUnaryMethod(getMarketStats, this.messageId('getMarketStats'), { logger, orderbooks }, { GetMarketStatsResponse }).register(),
      getTrades: new GrpcUnaryMethod(getTrades, this.messageId('getTrades'), { logger, relayer, orderbooks }, { GetTradesResponse }).register()
    }
  }

  messageId (methodName) {
    return `[${this.serviceName}:${methodName}]`
  }
}

module.exports = InfoService
