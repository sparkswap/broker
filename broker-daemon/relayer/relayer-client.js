const grpc = require('grpc')
const path = require('path')

const EXCHANGE_RPC_HOST = process.env.EXCHANGE_RPC_HOST

if (!EXCHANGE_RPC_HOST) {
  throw new Error('EXCHANGE_RPC_HOST needs to be specified.')
}

// TODO: change this before release
const PROTO_PATH = path.resolve('./proto/relayer.proto')
const PROTO_GRPC_TYPE = 'proto'
const PROTO_GRPC_OPTIONS = {
  convertFieldsToCamelCase: true,
  binaryAsBase64: true,
  longsAsStrings: true
}

const TIMEOUT_IN_SECONDS = 5

class RelayerClient {
  constructor () {
    this.address = EXCHANGE_RPC_HOST
    this.proto = grpc.load(PROTO_PATH, PROTO_GRPC_TYPE, PROTO_GRPC_OPTIONS)
    // TODO: we will need to add auth for daemon for a non-local address
    this.maker = new this.proto.Maker(this.address, grpc.credentials.createInsecure())
  }

  /**
   *
   * @param {Object} params
   */
  async createOrder (params) {
    // gRPC uses the term `deadline` which is a timeout feature that is an absolute
    // point in time, instead of a duration.
    const deadline = new Date().setSeconds(new Date().getSeconds() + TIMEOUT_IN_SECONDS)

    return new Promise((resolve, reject) => {
      this.maker.createOrder(params, { deadline }, (err, res) => {
        if (err) return reject(err)
        return resolve(res)
      })
    })
  }
}

module.exports = RelayerClient
