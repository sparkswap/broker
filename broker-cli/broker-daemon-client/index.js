const grpc = require('grpc')
const path = require('path')

const order = require('./order')
const orderbook = require('./orderbook')
const admin = require('./admin')
const wallet = require('./wallet')

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
    this.wallet = new this.proto.Wallet(this.address, grpc.credentials.createInsecure())

    Object.assign(this, order)
    Object.assign(this, orderbook)
    Object.assign(this, admin)
    Object.assign(this, wallet)
  }
}

module.exports = Broker
