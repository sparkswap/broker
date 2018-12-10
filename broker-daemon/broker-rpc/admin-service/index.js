const { GrpcUnaryMethod } = require('grpc-methods')
const { loadProto, transformLogger } = require('../../utils')

const healthCheck = require('./health-check')
const getIdentity = require('./get-identity')

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

    this.definition = this.proto.broker.rpc.AdminService.service
    this.serviceName = 'AdminService'

    const {
      HealthCheckResponse,
      GetIdentityResponse
    } = this.proto.broker.rpc

    this.implementation = {
      healthCheck: new GrpcUnaryMethod(healthCheck, { logger: this.loggerFor('healthCheck'), relayer, engines, auth }, { HealthCheckResponse }).register(),
      getIdentity: new GrpcUnaryMethod(getIdentity, { logger: this.loggerFor('getIdentity'), relayer, auth }, { GetIdentityResponse }).register()
    }
  }

  loggerFor (methodName) {
    return transformLogger(this.logger, (logFn, msg, ...args) => {
      return logFn(`[${this.serviceName}:${methodName}] ${msg}`, ...args)
    })
  }
}

module.exports = AdminService
