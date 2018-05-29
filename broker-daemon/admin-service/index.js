const { GrpcUnaryMethod } = require('grpc-methods')
const { loadProto } = require('../utils')

const healthCheck = require('./health-check')
const openChannel = require('./open-channel')

class AdminService {
  constructor (protoPath, { logger, relayer, engine }) {
    this.protoPath = protoPath
    this.proto = loadProto(this.protoPath)
    this.logger = logger

    this.definition = this.proto.AdminService.service
    this.serviceName = 'AdminService'

    const {
      HealthCheckResponse,
      OpenChannelResponse
    } = this.proto

    this.implementation = {
      healthCheck: new GrpcUnaryMethod(healthCheck, this.messageId('healthCheck'), { logger, relayer, engine }, { HealthCheckResponse }).register(),
      openChannel: new GrpcUnaryMethod(openChannel, this.messageId('openChannel'), { logger, relayer, engine }, { OpenChannelResponse }).register()
    }
  }

  messageId (methodName) {
    return `[${this.serviceName}:${methodName}]`
  }
}

module.exports = AdminService
