const { GrpcUnaryMethod } = require('grpc-methods')
const { loadProto } = require('../../utils')

const healthCheck = require('./health-check')
const getIdentity = require('./get-identity')
const register = require('./register')

class AdminService {
  /**
   * @param {String} protoPath
   * @param {Object} opts
   * @param {Object} opts.logger
   * @param {Object} opts.relayer
   * @param {Map} opts.engines
   * @param {Map} opts.orderbooks
   * @param {Function} opts.auth
   */
  constructor (protoPath, { logger, relayer, engines, orderbooks, auth }) {
    this.protoPath = protoPath
    this.proto = loadProto(this.protoPath)
    this.logger = logger

    this.definition = this.proto.broker.rpc.AdminService.service
    this.serviceName = 'AdminService'

    const {
      HealthCheckResponse,
      GetIdentityResponse,
      RegisterResponse
    } = this.proto.broker.rpc

    this.implementation = {
      healthCheck: new GrpcUnaryMethod(healthCheck, this.messageId('healthCheck'), { logger, relayer, engines, orderbooks, auth }, { HealthCheckResponse }).register(),
      getIdentity: new GrpcUnaryMethod(getIdentity, this.messageId('getIdentity'), { logger, relayer, auth }, { GetIdentityResponse }).register(),
      register: new GrpcUnaryMethod(register, this.messageId('register'), { logger, relayer }, { RegisterResponse }).register()
    }
  }

  messageId (methodName) {
    return `[${this.serviceName}:${methodName}]`
  }
}

module.exports = AdminService
