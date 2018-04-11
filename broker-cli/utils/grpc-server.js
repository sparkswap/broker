const grpc = require('grpc');
const path = require('path');

const PROTO_PATH = path.resolve('./proto/relayer.proto');
const PROTO_GRPC_TYPE = 'proto';
const PROTO_GRPC_OPTIONS = {
  convertFieldsToCamelCase: true,
  binaryAsBase64: true,
  longsAsStrings: true,
};
const GRPC_ADDRESS = process.env.GRPC_ADDRESS || 'localhost:50078';

class GrpcServer {
  constructor() {
    const proto = grpc.load(PROTO_PATH, PROTO_GRPC_TYPE, PROTO_GRPC_OPTIONS);
    this.maker = new proto.Maker(GRPC_ADDRESS, grpc.credentials.createInsecure());
  }

  /**
   *
   * @param {Object} params
   */
  async makerCreateOrder(params) {
    return new Promise((resolve, reject) => {
      this.maker.createOrder(params, (err, res) => {
        if (err) return reject(err);
        return resolve(res);
      });
    });
  }
}

module.exports = GrpcServer;
