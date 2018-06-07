const { GrpcUnaryMethod } = require('grpc-methods')
const { loadProto } = require('../utils')

const newDepositAddress = require('./new-deposit-address')
const getBalance = require('./get-balance')
const commitBalance = require('./commit-balance')

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
   * @param {LndEngine} options.engine
   */
  constructor (protoPath, { logger, engine, relayer }) {
    this.protoPath = protoPath
    this.proto = loadProto(this.protoPath)
    this.logger = logger
    this.engine = engine
    this.relayer = relayer

    this.definition = this.proto.WalletService.service
    this.serviceName = 'WalletService'

    const {
      NewDepositAddressResponse,
      GetBalanceResponse,
      CommitBalanceResponse
    } = this.proto

    this.implementation = {
      newDepositAddress: new GrpcUnaryMethod(newDepositAddress, this.messageId('newDepositAddress'), { logger, engine }, { NewDepositAddressResponse }).register(),
      getBalance: new GrpcUnaryMethod(getBalance, this.messageId('getBalance'), { logger, engine }, { GetBalanceResponse }).register(),
      commitBalance: new GrpcUnaryMethod(commitBalance, this.messageId('commitBalance'), { logger, engine, relayer }, { CommitBalanceResponse }).register()
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
