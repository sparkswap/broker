const { GrpcUnaryMethod } = require('grpc-methods')
const { loadProto } = require('../utils')

const healthCheck = require('./health-check')
const getInfo = require('./get-info')

class AdminService {
  constructor (protoPath, { logger, relayer, engine }) {
    this.protoPath = protoPath
    this.proto = loadProto(this.protoPath)
    this.logger = logger

    this.definition = this.proto.AdminService.service
    this.serviceName = 'AdminService'

    const {
      HealthCheckResponse,
      GetInfoResponse
    } = this.proto

    this.implementation = {
      healthCheck: new GrpcUnaryMethod(healthCheck, this.messageId('healthCheck'), { logger, relayer, engine }, { HealthCheckResponse }).register(),
      getInfo: new GrpcUnaryMethod(getInfo, this.messageId('getInfo'), { logger, engine }, { GetInfoResponse }).register()
    }
  }

  messageId (methodName) {
    return `[${this.serviceName}:${methodName}]`
  }
}

module.exports = AdminService
