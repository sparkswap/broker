const grpc = require('grpc')

const { loadProto } = require('../utils')

// TODO: Add this to config for CLI
const EXCHANGE_RPC_HOST = process.env.EXCHANGE_RPC_HOST || 'localhost:28492'
const RELAYER_PROTO_PATH = './proto/relayer.proto'
const TIMEOUT_IN_SECONDS = 5

class RelayerClient {
  constructor () {
    this.address = EXCHANGE_RPC_HOST
    this.proto = loadProto(RELAYER_PROTO_PATH)

    // TODO: we will need to add auth for daemon for a non-local address
    this.maker = new this.proto.Maker(this.address, grpc.credentials.createInsecure())
    this.orderbook = new this.proto.OrderBook(this.address, grpc.credentials.createInsecure())
  }

  /**
   * Creates an order w/ the exchange
   *
   * @param {Object} params
   * @returns {Promise}
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

  /**
   * Opens a stream with the exchange to watch for market events
   *
   * @param {Object} params
   */
  async watchMarket (params) {
    // TODO: Add better logging because there is no connection deadline here
    //   but we still want to verify if the connection is OK.
    return this.orderbook.watchMarket(params)
  }
}

module.exports = RelayerClient
