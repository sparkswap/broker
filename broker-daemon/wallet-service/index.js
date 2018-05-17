const { GrpcUnaryMethod, loadProto } = require('grpc-methods')

const newDepositAddress = require('./new-deposit-address')

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

    this.definition = this.proto.Wallet.service
    this.serviceName = 'Wallet'

    const { NewDepositAddressResponse } = this.proto

    this.implementation = {
      newAddress: new GrpcUnaryMethod(newDepositAddress, this.messageId('newDepositAddress'), { logger, engine }, { NewDepositAddressResponse }).register()
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
