const { GrpcUnaryMethod } = require('grpc-methods')
const { loadProto } = require('../../utils')

const healthCheck = require('./health-check')
const getDaemonConfig = require('./get-daemon-config')

class AdminService {
  constructor (protoPath, { logger, relayer, engine }) {
    this.protoPath = protoPath
    this.proto = loadProto(this.protoPath)
    this.logger = logger

    this.definition = this.proto.AdminService.service
    this.serviceName = 'AdminService'

    const {
      HealthCheckResponse,
      GetDaemonConfigResponse
    } = this.proto

    this.implementation = {
      healthCheck: new GrpcUnaryMethod(healthCheck, this.messageId('healthCheck'), { logger, relayer, engine }, { HealthCheckResponse }).register(),
      getDaemonConfig: new GrpcUnaryMethod(getDaemonConfig, this.messageId('getDaemonConfig'), { logger, engine }, { GetDaemonConfigResponse }).register()
    }
  }

  messageId (methodName) {
    return `[${this.serviceName}:${methodName}]`
  }
}

module.exports = AdminService
