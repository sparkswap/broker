/**
 * Generic 'Action' class to allow passing of logger and shared attributes to gRPC
 * event handlers
 *
 * @author kinesis.exchange
 */
class GrpcAction {
  constructor (logger, store, relayer) {
    this.logger = logger
    this.store = store
    this.relayer = relayer
  }
}

module.exports = GrpcAction
