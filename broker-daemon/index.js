const level = require('level')
const sublevel = require('level-sublevel')
const EventEmitter = require('events')

const GrpcServer = require('./grpc-server')

const {
  RPC_ADDRESS,
  DATA_DIR,
  MARKETS
} = process.env

const ENGINE_TYPE = process.env.ENGINE_TYPE || 'lnd'
const EXCHANGE_RPC_HOST = process.env.EXCHANGE_RPC_HOST || '0.0.0.0:28492'
const LND_TLS_CERT = process.env.LND_TLS_CERT || '~/.lnd/tls.cert'
const LND_MACAROON = process.env.LND_MACAROON || '~/.lnd/admin.macaroon'
const LND_RPC_HOST = process.env.ENGINE_RPC_HOST || '0.0.0.0:10009'

class BrokerDaemon {
  /**
   * Creates an RPC server with params from kbd cli
   *
   * @todo Validation of constructor params
   * @todo put defaults into a defaults.env file
   * @param {Array<String>} markets
   * @param {String} dataDir data directory path
   * @param
   */
  constructor (rpcAddress, dataDir, markets) {
    this.rpcAddress = rpcAddress || RPC_ADDRESS || '0.0.0.0:27492'
    this.dataDir = dataDir || DATA_DIR || '~/.kinesis/data'
    this.markets = markets || MARKETS || ''

    this.engineType = ENGINE_TYPE
    this.exchangeRpcHost = EXCHANGE_RPC_HOST
    this.lndTlsCert = LND_TLS_CERT
    this.lndMacaroon = LND_MACAROON
    this.lndRpcHost = LND_RPC_HOST

    this.logger = console
    this.store = sublevel(level(this.dataDir))
    this.eventHandler = new EventEmitter()
    this.server = new GrpcServer(this.logger, this.store, this.eventHandler)
    this.marketNames = (markets || '').split(',').filter(m => m)

    console.info(`Initializing ${this.marketNames.length} markets`)
    this.server.initializeMarkets(this.marketNames)
      .then(() => {
        console.info(`Caught up to ${this.marketNames.length} markets`)
        this.server.listen(this.rpcAddress)
        console.info(`gRPC server started: Server listening on ${this.rpcAddress}`)
      })
      .catch(console.error)
  }
}

module.exports = BrokerDaemon
