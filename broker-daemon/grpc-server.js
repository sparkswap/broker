const grpc = require('grpc');
const path = require('path');
const fs = require('fs');

const GRPC_HOST = process.env.GRPC_HOST || '0.0.0.0';
const GRPC_PORT = process.env.GRPC_PORT || '50078';
const PROTO_PATH = path.resolve('./broker-daemon/proto/broker.proto');
const PROTO_GRPC_TYPE = 'proto';
const PROTO_GRPC_OPTIONS = {
  convertFieldsToCamelCase: true,
  binaryAsBase64: true,
  longsAsStrings: true,
};

if (!fs.existsSync(PROTO_PATH)) {
  throw new Error(`broker.proto does not exist at ${PROTO_PATH}. please run 'npm run build'`);
}

class Action {

}

function createOrder() {
  return 'hello';
}

/**
 * Abstract class for a grpc server
 *
 * @author kinesis
 */
class GrpcServer {
  constructor() {
    this.proto = grpc.load(PROTO_PATH, PROTO_GRPC_TYPE, PROTO_GRPC_OPTIONS);
    this.brokerService = this.proto.Broker.service;
    this.server = new grpc.Server();
    this.action = new Action;

    this.server.addService(this.brokerService, {
      createOrder: createOrder.bind(this.action),
    });
  }

  /**
   * Binds a given port/host to our grpc server
   *
   * @param {String} host
   * @param {String} port
   * @returns {void}
   */
  listen(host = `${GRPC_HOST}:${GRPC_PORT}`) {
    this.server.bind(host, grpc.ServerCredentials.createInsecure());
    this.server.start();
    this.logger.info('gRPC server started', { host });
  }
}

module.exports = GrpcServer;
