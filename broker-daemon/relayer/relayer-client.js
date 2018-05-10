const grpc = require('grpc')

const { loadProto, helpers } = require('../utils')

// TODO: Add this to config for CLI
const EXCHANGE_RPC_HOST = process.env.EXCHANGE_RPC_HOST || 'localhost:28492'
const RELAYER_PROTO_PATH = './proto/relayer.proto'

class RelayerClient {
  constructor () {
    this.address = EXCHANGE_RPC_HOST
    this.proto = loadProto(RELAYER_PROTO_PATH)

    // TODO: we will need to add auth for daemon for a non-local address
    this.maker = new this.proto.Maker(this.address, grpc.credentials.createInsecure())
    this.orderbook = new this.proto.OrderBook(this.address, grpc.credentials.createInsecure())
    this.health = new this.proto.Health(this.address, grpc.credentials.createInsecure())
  }

  /**
   * Creates an order w/ the exchange
   *
   * @param {Object} params
   * @returns {Promise}
   */
  async createOrder (params) {
    const deadline = helpers.deadline()

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
    return this.orderbook.watchMarket(params)
  }

  async healthCheck (params) {
    const deadline = helpers.deadline()

    return new Promise((resolve, reject) => {
      this.health.check(params, { deadline }, (err, res) => {
        if (err) return reject(err)
        return resolve(res)
      })
    })
  }
}

module.exports = RelayerClient
