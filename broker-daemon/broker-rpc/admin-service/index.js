const { GrpcUnaryMethod } = require('grpc-methods')
const { loadProto } = require('../../utils')

const healthCheck = require('./health-check')

class AdminService {
  /**
   * @param {String} protoPath
   * @param {Object} opts
   * @param {Object} opts.logger
   * @param {Object} opts.relayer
   * @param {Map} opts.engines
   * @param {Function} opts.auth
   */
  constructor (protoPath, { logger, relayer, engines, auth }) {
    this.protoPath = protoPath
    this.proto = loadProto(this.protoPath)
    this.logger = logger

    console.log(this.proto)
    this.definition = this.proto.brokerrpc.AdminService.service
    this.serviceName = 'AdminService'

    const {
      HealthCheckResponse
    } = this.proto.brokerrpc

    this.implementation = {
      healthCheck: new GrpcUnaryMethod(healthCheck, this.messageId('healthCheck'), { logger, relayer, engines, auth }, { HealthCheckResponse }).register()
    }
  }

  messageId (methodName) {
    return `[${this.serviceName}:${methodName}]`
  }
}

module.exports = AdminService
