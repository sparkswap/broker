const { GrpcUnaryMethod } = require('grpc-methods')
const { loadProto } = require('../../utils')

const healthCheck = require('./health-check')
const getIdentity = require('./get-identity')
const register = require('./register')

/** @typedef {import('level-sublevel')} Sublevel */

class AdminService {
  /**
   * @param {string} protoPath
   * @param {object} opts
   * @param {object} opts.logger
   * @param {object} opts.relayer
   * @param {Map} opts.engines
   * @param {Map} opts.orderbooks
   * @param {Sublevel} opts.store
   * @param {Function} opts.auth
   */
  constructor (protoPath, { logger, relayer, engines, orderbooks, store, auth }) {
    this.protoPath = protoPath
    this.proto = loadProto(this.protoPath)
    this.logger = logger

    this.definition = this.proto.broker.rpc.AdminService.service
    this.serviceName = 'AdminService'

    this.implementation = {
      healthCheck: new GrpcUnaryMethod(healthCheck, this.messageId('healthCheck'), { logger, relayer, engines, orderbooks, store, auth }).register(),
      getIdentity: new GrpcUnaryMethod(getIdentity, this.messageId('getIdentity'), { logger, relayer, auth }).register(),
      register: new GrpcUnaryMethod(register, this.messageId('register'), { logger, relayer }).register()
    }
  }

  messageId (methodName) {
    return `[${this.serviceName}:${methodName}]`
  }
}

module.exports = AdminService
