const grpc = require('grpc')
const path = require('path')

const BROKER_DAEMON_HOST = process.env.BROKER_DAEMON_HOST

// TODO: Break actions in the broker out into seperate modules
class Broker {
  constructor (address) {
    // TODO: Remove proto out of broker file (into its own module?)
    // TODO: Change this to use npm instead of a relative path to the daemon
    this.protoPath = path.resolve('./broker-daemon/proto/broker.proto')
    this.protoFileType = 'proto'
    this.protoOptions = {
      convertFieldsToCamelCase: true,
      binaryAsBase64: true,
      longsAsStrings: true
    }
    this.proto = grpc.load(this.protoPath, this.protoFileType, this.protoOptions)

    // TODO: we will need to add auth for daemon for a non-local address
    this.address = address || BROKER_DAEMON_HOST || 'localhost:27492'
    this.admin = new this.proto.Admin(this.address, grpc.credentials.createInsecure())
    this.order = new this.proto.Order(this.address, grpc.credentials.createInsecure())
    this.orderBook = new this.proto.OrderBook(this.address, grpc.credentials.createInsecure())
  }

  /**
   * Makes a call to the broker daemon to create an order
   *
   * @param {Object} params
   * @returns {Promise}
   */
  async createOrder (params) {
    // TODO: Add a duration for gRPC
    return new Promise((resolve, reject) => {
      this.order.createOrder(params, (err, res) => {
        if (err) return reject(err)
        return resolve(res)
      })
    })
  }

  /**
   * Opens a stream with the broker daemon to watch for market events from
   * the exchange
   *
   * @param {Object} params
   * @returns {Promise}
   */
  async watchMarket (params) {
    return this.orderBook.watchMarket(params)
  }

  /**
   * Calls a healthcheck endpoint on the broker to determine connectivity
   *
   */
  async healthCheck () {
    return new Promise((resolve, reject) => {
      this.admin.healthCheck({}, (err, res) => {
        if (err) return reject(err)
        return resolve(res)
      })
    })
  }
}

module.exports = Broker
