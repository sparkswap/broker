const { GrpcUnaryMethod } = require('grpc-methods')
const { loadProto } = require('../../utils')

const healthCheck = require('./health-check')

class AdminService {
  constructor (protoPath, { logger, relayer, engines, basicAuth }) {
    this.protoPath = protoPath
    this.proto = loadProto(this.protoPath)
    this.logger = logger

    this.definition = this.proto.AdminService.service
    this.serviceName = 'AdminService'

    const {
      HealthCheckResponse
    } = this.proto

    this.implementation = {
      healthCheck: new GrpcUnaryMethod(healthCheck, this.messageId('healthCheck'), { logger, relayer, engines }, { HealthCheckResponse }, basicAuth).register()
    }
  }

  messageId (methodName) {
    return `[${this.serviceName}:${methodName}]`
  }
}

module.exports = AdminService
