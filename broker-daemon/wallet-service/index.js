const { GrpcUnaryMethod, loadProto } = require('grpc-methods')

const newWalletAddress = require('./new-wallet-address')

/**
 * WalletService provides interactions with an engine's crypto wallet
 */
class WalletService {
  /**
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

    const { NewWalletAddressResponse } = this.proto

    this.implementation = {
      newWalletAddress: new GrpcUnaryMethod(newWalletAddress, this.messageId('healthCheck'), { logger, engine }, { NewWalletAddressResponse }).register()
    }
  }

  messageId (methodName) {
    return `[${this.serviceName}:${methodName}]`
  }
}

module.exports = WalletService
