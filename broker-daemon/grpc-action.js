/**
 * Generic 'Action' class to allow passing of logger and shared attributes to gRPC
 * event handlers
 *
 * @author kinesis.exchange
 */
class GrpcAction {
  constructor (logger, marketEventManager) {
    this.logger = logger
    this.marketEventManager = marketEventManager
  }
}

module.exports = GrpcAction
