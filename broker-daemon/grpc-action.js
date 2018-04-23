/**
 * Generic 'Action' class to allow passing of logger and shared attributes to gRPC
 * event handlers
 *
 * @author kinesis.exchange
 */
class GrpcAction {
  constructor (logger) {
    this.logger = logger
  }
}

module.exports = GrpcAction
