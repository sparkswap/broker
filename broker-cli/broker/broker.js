const grpc = require('grpc')
const path = require('path')

const BROKER_DAEMON_HOST = process.env.BROKER_DAEMON_HOST

if (!BROKER_DAEMON_HOST) throw new Error('No BROKER_DAEMON_HOST has been specified.')

// TODO: Change this to use npm instead of a relative path to the daemon
const PROTO_PATH = path.resolve('./broker-daemon/proto/broker.proto')
const PROTO_GRPC_TYPE = 'proto'
const PROTO_GRPC_OPTIONS = {
  convertFieldsToCamelCase: true,
  binaryAsBase64: true,
  longsAsStrings: true
}

class Broker {
  constructor (address) {
    // TODO: default to the ENV variable, but overriden by the address that is passed in
    this.address = BROKER_DAEMON_HOST
    this.proto = grpc.load(PROTO_PATH, PROTO_GRPC_TYPE, PROTO_GRPC_OPTIONS)
    // TODO: we will need to add auth for daemon for a non-local address
    this.maker = new this.proto.Broker(this.address, grpc.credentials.createInsecure())
  }

  /**
   *
   * @param {Object} params
   */
  async createOrder (params) {
    return new Promise((resolve, reject) => {
      this.maker.createOrder(params, (err, res) => {
        if (err) return reject(err)
        return resolve(res)
      })
    })
  }
}

module.exports = Broker
