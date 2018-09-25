const { GrpcUnaryMethod } = require('grpc-methods')
const { loadProto } = require('../../utils')

const getSupportedMarkets = require('./get-supported-markets')
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
      GetTradesResponse
    } = this.proto

    this.implementation = {
      getSupportedMarkets: new GrpcUnaryMethod(getSupportedMarkets, this.messageId('getSupportedMarkets'), { logger, relayer, orderbooks }, { GetSupportedMarketsResponse }).register(),
      getTrades: new GrpcUnaryMethod(getTrades, this.messageId('getTrades'), { logger, relayer, orderbooks }, { GetTradesResponse }).register()
    }
  }

  messageId (methodName) {
    return `[${this.serviceName}:${methodName}]`
  }
}

module.exports = InfoService
