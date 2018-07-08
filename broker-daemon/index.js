const level = require('level')
const sublevel = require('level-sublevel')
const EventEmitter = require('events')
const LndEngine = require('lnd-engine')

const RelayerClient = require('./relayer')
const Orderbook = require('./orderbook')
const BlockOrderWorker = require('./block-order-worker')
const BrokerRPCServer = require('./broker-rpc/broker-rpc-server')
const InterchainRouter = require('./interchain-router')
const { logger } = require('./utils')
const CONFIG = require('./config')

const {
  RPC_ADDRESS,
  DATA_DIR,
  MARKETS,
  INTERCHAIN_ROUTER_ADDRESS
} = process.env

const ENGINE_TYPE = process.env.ENGINE_TYPE || 'lnd'
const EXCHANGE_RPC_HOST = process.env.EXCHANGE_RPC_HOST || '0.0.0.0:28492'
const LND_TLS_CERT = process.env.LND_TLS_CERT || '~/.lnd/tls.cert'
const LND_MACAROON = process.env.LND_MACAROON || '~/.lnd/admin.macaroon'
const LND_RPC_HOST = process.env.LND_HOST || '0.0.0.0:10009'

/**
 * @class BrokerDaemon is a collection of services to allow a user to run a broker on the Kinesis Network.
 * It exposes a user-facing RPC server, an interchain router, watches markets on the relayer, and works
 * block orders in the background.
 */
class BrokerDaemon {
  /**
   * Creates a Broker Daemon with params from kbd cli
   *
   * @todo Validation of constructor params
   * @todo put defaults into a defaults.env file
   * @param  {String} rpcAddress              Host and port where the user-facing RPC server should listen
   * @param  {String} dataDir                 Relative path to a directory where application data should be stored
   * @param  {String} markets                 Comma-delimited list of market names (e.g. 'BTC/LTC') to support
   * @param  {String} interchainRouterAddress Host and port where the interchain router should listen
   * @return {BrokerDaemon}
   */
  constructor (rpcAddress, dataDir, markets, interchainRouterAddress) {
    this.rpcAddress = rpcAddress || RPC_ADDRESS || '0.0.0.0:27492'
    this.dataDir = dataDir || DATA_DIR || '~/.kinesis/data'
    this.markets = markets || MARKETS || ''
    this.marketNames = (markets || '').split(',').filter(m => m)
    this.interchainRouterAddress = interchainRouterAddress || INTERCHAIN_ROUTER_ADDRESS || '0.0.0.0:40369'
    this.engineType = ENGINE_TYPE
    this.exchangeRpcHost = EXCHANGE_RPC_HOST
    this.lndTlsCert = LND_TLS_CERT
    this.lndMacaroon = LND_MACAROON
    this.lndRpcHost = LND_RPC_HOST

    this.logger = logger
    this.store = sublevel(level(this.dataDir))
    this.eventHandler = new EventEmitter()
    this.relayer = new RelayerClient()
    this.engine = new LndEngine(this.lndRpcHost, { logger: this.logger, tlsCertPath: this.lndTlsCert, macaroonPath: this.lndMacaroon })
    this.orderbooks = new Map()

    this.blockOrderWorker = new BlockOrderWorker({
      relayer: this.relayer,
      engine: this.engine,
      orderbooks: this.orderbooks,
      store: this.store.sublevel('block-orders'),
      logger: this.logger
    })
    this.rpcServer = new BrokerRPCServer({
      logger: this.logger,
      engine: this.engine,
      relayer: this.relayer,
      orderbooks: this.orderbooks,
      blockOrderWorker: this.blockOrderWorker
    })
    this.interchainRouter = new InterchainRouter({
      ordersByHash: this.blockOrderWorker.ordersByHash,
      logger: this.logger
    })
  }

  /**
   * Initialize the broker daemon which:
   * - listens to market events on the Relayer
   * - Sets up the user-facing RPC Server
   * - Sets up the Interchain Router
   * @return {Promise}
   */
  async initialize () {
    try {
      // Since both of these are potentially long-running operations, we run them in parallel to speed
      // up BrokerDaemon startup time.
      await Promise.all([
        this.initializeMarkets(this.marketNames),
        (async () => {
          this.logger.info(`Initializing BlockOrderWorker`)
          await this.blockOrderWorker.initialize()
          this.logger.info('BlockOrderWorker initialized')
        })()
      ])

      this.rpcServer.listen(this.rpcAddress)
      this.logger.info(`BrokerDaemon RPC server started: gRPC Server listening on ${this.rpcAddress}`)

      this.interchainRouter.listen(this.interchainRouterAddress)
      this.logger.info(`Interchain Router server started: gRPC Server listening on ${this.interchainRouterAddress}`)
    } catch (e) {
      this.logger.error('BrokerDaemon failed to initialize', { error: e.toString() })
      this.logger.error(e)
    }
  }

  /**
   * Listens to the assigned markets
   *
   * @param {Array<String>} markets
   * @returns {Promise<void>} promise that resolves when markets are caught up to the remote
   * @throws {Error} If markets include a currency with no currency configuration
   */
  async initializeMarkets (markets) {
    this.logger.info(`Initializing ${markets.length} markets`)
    await Promise.all(markets.map((marketName) => {
      return this.initializeMarket(marketName)
    }))
    this.logger.info(`Caught up to ${markets.length} markets`)
  }

  /**
   * Listens to the assigned market
   *
   * @param {String} marketName
   * @returns {Promise<void>} promise that resolves when market is caught up to the remote
   */
  async initializeMarket (marketName) {
    const symbols = marketName.split('/')
    if (!symbols.every(sym => CONFIG.currencies.find(({ symbol }) => symbol === sym.toUpperCase()))) {
      throw new Error(`Currency config is required for both symbols of ${marketName}`)
    }

    if (this.orderbooks.get(marketName)) {
      this.logger.warn(`initializeMarket: Already have an orderbook for ${marketName}, skipping.`)
      return
    }

    this.orderbooks.set(marketName, new Orderbook(marketName, this.relayer, this.store.sublevel(marketName), this.logger))
    return this.orderbooks.get(marketName).initialize()
  }
}

module.exports = BrokerDaemon
