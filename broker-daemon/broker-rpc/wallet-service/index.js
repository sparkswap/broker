const { GrpcUnaryMethod } = require('grpc-methods')
const { loadProto } = require('../../utils')

const newDepositAddress = require('./new-deposit-address')
const getBalances = require('./get-balances')
const commit = require('./commit')
const getPaymentChannelNetworkAddress = require('./get-payment-channel-network-address')
const getTradingCapacities = require('./get-trading-capacities')
const releaseChannels = require('./release-channels')
const withdrawFunds = require('./withdraw-funds')
const createWallet = require('./create-wallet')
const unlockWallet = require('./unlock-wallet')
const walletHistory = require('./wallet-history')
const changeWalletPassword = require('./change-wallet-password')

/**
 * WalletService provides interactions with an engine's crypto wallet
 */
class WalletService {
  /**
   * @class
   * @param {String} protoPath
   * @param {Object} options
   * @param {Map<String, LndEngine>} options.engines
   * @param {RelayerClient} options.relayer
   * @param {Map<String, Orderbook>} options.orderbooks - Collection of all active Orderbooks
   * @param {BlockOrderWorker} opts.blockOrderWorker
   * @param {Function} options.auth
   * @param {Logger} options.logger
   */
  // walletService takes in the BlockOrderWorker because getTradingCapacities needs to know about outstanding orders/fills
  constructor (protoPath, { engines, relayer, orderbooks, blockOrderWorker, auth, logger }) {
    this.protoPath = protoPath
    this.proto = loadProto(this.protoPath)
    this.logger = logger
    this.definition = this.proto.broker.rpc.WalletService.service
    this.serviceName = 'WalletService'
    this.engines = engines

    const {
      NewDepositAddressResponse,
      GetBalancesResponse,
      GetPaymentChannelNetworkAddressResponse,
      GetTradingCapacitiesResponse,
      WithdrawFundsResponse,
      CreateWalletResponse,
      ReleaseChannelsResponse,
      WalletHistoryResponse,
      google: {
        protobuf: {
          Empty: EmptyResponse
        }
      }
    } = this.proto.broker.rpc

    this.implementation = {
      newDepositAddress: new GrpcUnaryMethod(newDepositAddress, this.messageId('newDepositAddress'), { logger, engines, auth }, { NewDepositAddressResponse }).register(),
      getBalances: new GrpcUnaryMethod(getBalances, this.messageId('getBalances'), { logger, engines, auth }, { GetBalancesResponse }).register(),
      commit: new GrpcUnaryMethod(commit, this.messageId('commit'), { logger, engines, relayer, orderbooks, auth }, { EmptyResponse }).register(),
      getPaymentChannelNetworkAddress: new GrpcUnaryMethod(getPaymentChannelNetworkAddress, this.messageId('getPaymentChannelNetworkAddress'), { logger, engines, auth }, { GetPaymentChannelNetworkAddressResponse }).register(),
      getTradingCapacities: new GrpcUnaryMethod(getTradingCapacities, this.messageId('getTradingCapacities'), { logger, engines, orderbooks, blockOrderWorker, auth }, { GetTradingCapacitiesResponse }).register(),
      releaseChannels: new GrpcUnaryMethod(releaseChannels, this.messageId('releaseChannels'), { logger, engines, orderbooks, blockOrderWorker, auth }, { ReleaseChannelsResponse }).register(),
      withdrawFunds: new GrpcUnaryMethod(withdrawFunds, this.messageId('withdrawFunds'), { logger, engines, auth }, { WithdrawFundsResponse }).register(),
      createWallet: new GrpcUnaryMethod(createWallet, this.messageId('createWallet'), { logger, engines, auth }, { CreateWalletResponse }).register(),
      unlockWallet: new GrpcUnaryMethod(unlockWallet, this.messageId('unlockWallet'), { logger, engines, auth }, { EmptyResponse }).register(),
      changeWalletPassword: new GrpcUnaryMethod(changeWalletPassword, this.messageId('changeWalletPassword'), { logger, engines, auth }, { EmptyResponse }).register(),
      walletHistory: new GrpcUnaryMethod(walletHistory, this.messageId('walletHistory'), { logger, engines, auth }, { WalletHistoryResponse }).register()
    }
  }

  /**
   * Returns a message ID for a given method name
   *
   * @function
   * @param {string} methodName
   * @returns {string} [serviceName:methodName]
   */
  messageId (methodName) {
    return `[${this.serviceName}:${methodName}]`
  }
}

module.exports = WalletService
