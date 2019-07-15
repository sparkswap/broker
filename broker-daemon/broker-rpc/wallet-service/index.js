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
const recoverWallet = require('./recover-wallet')

/** @typedef {import('../broker-rpc-server').RelayerClient} RelayerClient */
/** @typedef {import('../broker-rpc-server').Logger} Logger */
/** @typedef {import('../broker-rpc-server').BlockOrderWorker} BlockOrderWorker */
/** @typedef {import('../broker-rpc-server').Orderbook} Orderbook */
/** @typedef {import('../broker-rpc-server').Engine} Engine */

/**
 * WalletService provides interactions with an engine's crypto wallet
 */
class WalletService {
  /**
   * @class
   * @param {string} protoPath
   * @param {object} options
   * @param {Map<string, Engine>} options.engines
   * @param {RelayerClient} options.relayer
   * @param {Map<string, Orderbook>} options.orderbooks - Collection of all active Orderbooks
   * @param {BlockOrderWorker} options.blockOrderWorker
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

    this.implementation = {
      newDepositAddress: new GrpcUnaryMethod(newDepositAddress, this.messageId('newDepositAddress'), { logger, engines, auth }).register(),
      getBalances: new GrpcUnaryMethod(getBalances, this.messageId('getBalances'), { logger, engines, auth }).register(),
      commit: new GrpcUnaryMethod(commit, this.messageId('commit'), { logger, engines, relayer, orderbooks, auth }).register(),
      getPaymentChannelNetworkAddress: new GrpcUnaryMethod(getPaymentChannelNetworkAddress, this.messageId('getPaymentChannelNetworkAddress'), { logger, engines, auth }).register(),
      getTradingCapacities: new GrpcUnaryMethod(getTradingCapacities, this.messageId('getTradingCapacities'), { logger, engines, orderbooks, blockOrderWorker, auth }).register(),
      releaseChannels: new GrpcUnaryMethod(releaseChannels, this.messageId('releaseChannels'), { logger, engines, orderbooks, blockOrderWorker, auth }).register(),
      withdrawFunds: new GrpcUnaryMethod(withdrawFunds, this.messageId('withdrawFunds'), { logger, engines, auth }).register(),
      createWallet: new GrpcUnaryMethod(createWallet, this.messageId('createWallet'), { logger, engines, auth }).register(),
      unlockWallet: new GrpcUnaryMethod(unlockWallet, this.messageId('unlockWallet'), { logger, engines, auth }).register(),
      changeWalletPassword: new GrpcUnaryMethod(changeWalletPassword, this.messageId('changeWalletPassword'), { logger, engines, auth }).register(),
      walletHistory: new GrpcUnaryMethod(walletHistory, this.messageId('walletHistory'), { logger, engines, auth }).register(),
      recoverWallet: new GrpcUnaryMethod(recoverWallet, this.messageId('recoverWallet'), { logger, engines, auth }).register()
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
