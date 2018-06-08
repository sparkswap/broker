const { GrpcUnaryMethod } = require('grpc-methods')
const { loadProto } = require('../utils')

const healthCheck = require('./health-check')
const setup = require('./setup')

class AdminService {
  constructor (protoPath, { logger, relayer, engine }) {
    this.protoPath = protoPath
    this.proto = loadProto(this.protoPath)
    this.logger = logger

    this.definition = this.proto.AdminService.service
    this.serviceName = 'AdminService'

    const {
      HealthCheckResponse,
      SetupResponse
    } = this.proto

    this.implementation = {
      healthCheck: new GrpcUnaryMethod(healthCheck, this.messageId('healthCheck'), { logger, relayer, engine }, { HealthCheckResponse }).register(),
      setup: new GrpcUnaryMethod(setup, this.messageId('setup'), { logger, relayer, engine }, { SetupResponse }).register()
    }
  }

  messageId (methodName) {
    return `[${this.serviceName}:${methodName}]`
  }
}

module.exports = AdminService
