const { GrpcUnaryMethod } = require('grpc-methods')
const { loadProto } = require('../../utils')

const newDepositAddress = require('./new-deposit-address')
const getBalances = require('./get-balances')
const commitBalance = require('./commit-balance')
const getPaymentChannelNetworkAddress = require('./get-payment-channel-network-address')
const getTradingCapacities = require('./get-trading-capacities')

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
   */
  constructor (protoPath, { logger, engines, relayer }) {
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
      google: {
        protobuf: {
          Empty: EmptyResponse
        }
      },
      GetTradingCapacitiesResponse
    } = this.proto

    this.implementation = {
      newDepositAddress: new GrpcUnaryMethod(newDepositAddress, this.messageId('newDepositAddress'), { logger, engines }, { NewDepositAddressResponse }).register(),
      getBalances: new GrpcUnaryMethod(getBalances, this.messageId('getBalances'), { logger, engines }, { GetBalancesResponse }).register(),
      commitBalance: new GrpcUnaryMethod(commitBalance, this.messageId('commitBalance'), { logger, engines, relayer }, { EmptyResponse }).register(),
      getPaymentChannelNetworkAddress: new GrpcUnaryMethod(getPaymentChannelNetworkAddress, this.messageId('getPaymentChannelNetworkAddress'), { logger, engines }, { GetPaymentChannelNetworkAddressResponse }).register(),
      getTradingCapacities: new GrpcUnaryMethod(getTradingCapacities, this.messageId('getTradingCapacities'), { logger, engines }, { GetTradingCapacitiesResponse }).register()
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
