const { GrpcUnaryMethod } = require('grpc-methods')
const { loadProto } = require('../utils')

const newDepositAddress = require('./new-deposit-address')
const getBalance = require('./get-balance')

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
  constructor (protoPath, { logger, engine }) {
    this.protoPath = protoPath
    this.proto = loadProto(this.protoPath)
    this.logger = logger
    this.engine = engine

    this.definition = this.proto.WalletService.service
    this.serviceName = 'WalletService'

    const {
      NewDepositAddressResponse,
      GetBalanceResponse
    } = this.proto

    this.implementation = {
      newDepositAddress: new GrpcUnaryMethod(newDepositAddress, this.messageId('newDepositAddress'), { logger, engine }, { NewDepositAddressResponse }).register(),
      getBalance: new GrpcUnaryMethod(getBalance, this.messageId('getBalance'), { logger, engine }, { GetBalanceResponse }).register()
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
