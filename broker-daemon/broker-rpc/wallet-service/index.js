const { GrpcUnaryMethod } = require('grpc-methods')
const { loadProto } = require('../../utils')

const newDepositAddress = require('./new-deposit-address')
const getBalances = require('./get-balances')
const commit = require('./commit')
const getPaymentChannelNetworkAddress = require('./get-payment-channel-network-address')
const getTradingCapacities = require('./get-trading-capacities')
const releaseChannels = require('./release-channels')

/**
 * WalletService provides interactions with an engine's crypto wallet
 */
class WalletService {
  /**
   * @class
   * @param {String} protoPath
   * @param {Object} options
   * @param {Logger} options.logger
   * @param {RelayerClient} options.relayer
   * @param {Map<String, LndEngine>} options.engines
   * @param {Function} options.auth
   */
  constructor (protoPath, { logger, engines, relayer, orderbooks, auth }) {
    this.protoPath = protoPath
    this.proto = loadProto(this.protoPath)
    this.logger = logger
    this.definition = this.proto.WalletService.service
    this.serviceName = 'WalletService'
    this.engines = engines

    const {
      NewDepositAddressResponse,
      GetBalancesResponse,
      GetPaymentChannelNetworkAddressResponse,
      GetTradingCapacitiesResponse,
      google: {
        protobuf: {
          Empty: EmptyResponse
        }
      }
    } = this.proto

    this.implementation = {
      newDepositAddress: new GrpcUnaryMethod(newDepositAddress, this.messageId('newDepositAddress'), { logger, engines, auth }, { NewDepositAddressResponse }).register(),
      getBalances: new GrpcUnaryMethod(getBalances, this.messageId('getBalances'), { logger, engines, auth }, { GetBalancesResponse }).register(),
      commit: new GrpcUnaryMethod(commit, this.messageId('commit'), { logger, engines, relayer, orderbooks, auth }, { EmptyResponse }).register(),
      getPaymentChannelNetworkAddress: new GrpcUnaryMethod(getPaymentChannelNetworkAddress, this.messageId('getPaymentChannelNetworkAddress'), { logger, engines, auth }, { GetPaymentChannelNetworkAddressResponse }).register(),
      getTradingCapacities: new GrpcUnaryMethod(getTradingCapacities, this.messageId('getTradingCapacities'), { logger, engines, orderbooks, auth }, { GetTradingCapacitiesResponse }).register(),
      releaseChannels: new GrpcUnaryMethod(releaseChannels, this.messageId('releaseChannels'), { logger, engines, orderbooks, auth }, { EmptyResponse }).register()
    }
  }

  /**
   * Returns a message ID for a given method name
   *
   * @function
   * @param {String} methodName
   * @return {String} [serviceName:methodName]
   */
  messageId (methodName) {
    return `[${this.serviceName}:${methodName}]`
  }
}

module.exports = WalletService
