/**
 * Generic 'Action' class to allow passing of logger and shared attributes to gRPC
 * event handlers
 *
 * @author kinesis.exchange
 */
class GrpcAction {
  constructor (logger, store) {
    this.logger = logger
    this.store = store
  }
}

module.exports = GrpcAction
