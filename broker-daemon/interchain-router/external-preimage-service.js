const { GrpcServerStreamingMethod } = require('grpc-methods')
const { loadProto } = require('../utils')
const getPreimage = require('./get-preimage')

/**
 * @class gRPC service for retrieving preimages stored externally
 */
class ExternalPreimageService {
  /**
   * @param  {String} protoPath full file path to the .proto file for the ExternalPreimageService definition
   * @param  {Object} options
   * @param  {SublevelIndex} options.ordersByHash Orders for which we are the maker, index by swap hash
   * @param  {Map<String, Engine>} options.engines All available engines
   * @param  {Object} options.logger Logger to be used in methods
   * @return {ExternalPreimageService}
   */
  constructor (protoPath, { ordersByHash, engines, logger }) {
    this.protoPath = protoPath
    this.proto = loadProto(this.protoPath)

    this.definition = this.proto.extpreimage.ExternalPreimageService.service
    this.serviceName = 'ExternalPreimageService'

    this.implementation = {
      getPreimage: new GrpcServerStreamingMethod(getPreimage, this.messageId('getPreimage'), { ordersByHash, logger, engines }).register()
    }
  }

  /**
   * Create a logging string specific to this service and method
   * @param  {String} methodName
   * @return {String}
   */
  messageId (methodName) {
    return `[${this.serviceName}:${methodName}]`
  }
}

module.exports = ExternalPreimageService
