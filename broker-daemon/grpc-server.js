const grpc = require('grpc')
const path = require('path')
const fs = require('fs')
const { status } = require('grpc')

const { RelayerClient } = require('./relayer')

const PROTO_PATH = path.resolve('./broker-daemon/proto/broker.proto')
const PROTO_GRPC_TYPE = 'proto'
const PROTO_GRPC_OPTIONS = {
  convertFieldsToCamelCase: true,
  binaryAsBase64: true,
  longsAsStrings: true
}

if (!fs.existsSync(PROTO_PATH)) {
  throw new Error(`broker.proto does not exist at ${PROTO_PATH}. please run 'npm run build'`)
}

class Action {
  constructor (logger) {
    this.logger = logger
  }
}

async function createOrder (call, cb) {
  const {
    // amount,
    // price,
    market,
    // timeinforce,
    side
  } = call.request

  // We need to calculate the base amount/counter amount based off of current
  // prices
  //
  // We need to split the market

  const [baseSymbol, counterSymbol] = market.split('/')

  const request = {
    ownerId: '123455678',
    payTo: 'ln:12234987',
    baseSymbol,
    counterSymbol,
    baseAmount: '10000',
    counterAmount: '1000000',
    side
  }

  const relayer = new RelayerClient()

  try {
    this.logger.info('Attempting to create order')
    const order = await relayer.createOrder(request)
    cb(null, { orderId: order.orderId })
  } catch (e) {
    this.logger.error('Something messed up')

    // eslint-disable-next-line
    return cb({ message: e.message, code: status.INTERNAL })
  }
}

/**
 * Abstract class for a grpc server
 *
 * @author kinesis
 */
class GrpcServer {
  constructor (logger) {
    this.logger = logger
    this.proto = grpc.load(PROTO_PATH, PROTO_GRPC_TYPE, PROTO_GRPC_OPTIONS)
    this.brokerService = this.proto.Broker.service
    this.server = new grpc.Server()
    this.action = new Action(this.logger)

    this.server.addService(this.brokerService, {
      createOrder: createOrder.bind(this.action)
    })
  }

  /**
   * Binds a given port/host to our grpc server
   *
   * @param {String} host
   * @param {String} port
   * @returns {void}
   */
  listen (host) {
    this.server.bind(host, grpc.ServerCredentials.createInsecure())
    this.server.start()
  }
}

module.exports = GrpcServer
