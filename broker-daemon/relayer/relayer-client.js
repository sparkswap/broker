const grpc = require('grpc');
const path = require('path');

const GRPC_ADDRESS = process.env.GRPC_ADDRESS || '0.0.0.0:50078';

// TODO: change this before release
const PROTO_PATH = path.resolve('./proto/relayer.proto');
const PROTO_GRPC_TYPE = 'proto';
const PROTO_GRPC_OPTIONS = {
  convertFieldsToCamelCase: true,
  binaryAsBase64: true,
  longsAsStrings: true,
};

class RelayerClient {
  constructor(address) {
    this.address = address || GRPC_ADDRESS;
    this.proto = grpc.load(PROTO_PATH, PROTO_GRPC_TYPE, PROTO_GRPC_OPTIONS);
    // TODO: we will need to add auth for daemon for a non-local address
    this.maker = new this.proto.Maker(this.address, grpc.credentials.createInsecure());
  }

  /**
   *
   * @param {Object} params
   */
  async createOrder(params) {
    return new Promise((resolve, reject) => {
      this.maker.createOrder(params, (err, res) => {
        if (err) return reject(err);
        return resolve(res);
      });
    });
  }
}

module.exports = RelayerClient;
