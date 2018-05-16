const { GrpcUnaryMethod, loadProto } = require('grpc-methods')

const healthCheck = require('./health-check')

class AdminService {
  constructor (protoPath, { logger, relayer }) {
    this.protoPath = protoPath
    this.proto = loadProto(this.protoPath)
    this.logger = logger

    this.definition = this.proto.Admin.service
    this.serviceName = 'Admin'

    const {
      HealthCheckResponse
    } = this.proto

    this.implementation = {
      healthCheck: new GrpcUnaryMethod(healthCheck, this.messageId('healthCheck'), { logger, relayer }, { HealthCheckResponse }).register()
    }
  }

  messageId (methodName) {
    return `[${this.serviceName}:${methodName}]`
  }
}

module.exports = AdminService
