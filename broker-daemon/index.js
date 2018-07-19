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

/**
 * Default host and port for the BrokerRPCServer to listen on
 * @constant
 * @type {String}
 */
const DEFAULT_RPC_ADDRESS = '0.0.0.0:27492'

/**
 * Default file path to store broker data
 * @constant
 * @type {String}
 */
const DEFAULT_DATA_DIR = '~/.kinesis/data'

/**
 * Default host and port for the InterchainRouter to listen on
 * @constant
 * @type {String}
 */
const DEFAULT_INTERCHAIN_ROUTER_ADDRESS = '0.0.0.0:40369'

/**
 * Default host and port that the Relayer is set up on
 * @constant
 * @type {String}
 */
const DEFAULT_RELAYER_HOST = 'localhost:28492'

/**
 * Create an instance of an engine from provided configuration
 * @param  {String} symbol         Symbol that this engine is responsible for
 * @param  {Object} engineConfig   Configuration object for this engine
 * @param  {Logger} options.logger Logger that this engine should use
 * @return {LndEngine}
 */
function createEngineFromConfig (symbol, engineConfig, { logger }) {
  if (engineConfig.type === 'LND') {
    return new LndEngine(
      engineConfig.lndRpc,
      symbol,
      {
        logger,
        tlsCertPath: engineConfig.lndTls,
        macaroonPath: engineConfig.lndMacaroon
      }
    )
  } else {
    throw new Error(`Unknown engine type of ${engineConfig.type} for ${symbol}`)
  }
}

/**
 * @class BrokerDaemon is a collection of services to allow a user to run a broker on the Kinesis Network.
 * It exposes a user-facing RPC server, an interchain router, watches markets on the relayer, and works
 * block orders in the background.
 */
class BrokerDaemon {
  /**
   * @param  {RelayerClient~KeyPath} idKeyPath                Path to public and private key for the broker's identity
   * @param  {String}                rpcAddress               Host and port where the user-facing RPC server should listen
   * @param  {String}                interchainRouterAddress  Host and port where the interchain router should listen
   * @param  {String}                relayOpts.relayerRpcHost Host and port for the Relayer RPC
   * @param  {String}                relayOpts.certPath       Absolute path to the root certificate for the relayer
   * @param  {String}                dataDir                  Relative path to a directory where application data should be stored
   * @param  {Array}                 marketNames              List of market names (e.g. 'BTC/LTC') to support
   * @param  {Object}                engines                  Configuration for all the engines to instantiate
   * @return {BrokerDaemon}
   */
  constructor (idKeyPath = {}, rpcAddress, interchainRouterAddress, { relayerCertPath, relayerRpcHost } = {}, dataDir, marketNames, engines) {
    if (!idKeyPath.privKeyPath) {
      throw new Error(`Private Key path is required to create a BrokerDaemon`)
    }
    if (!idKeyPath.pubKeyPath) {
      throw new Error(`Public Key path is required to create a BrokerDaemon`)
    }

    this.rpcAddress = rpcAddress || DEFAULT_RPC_ADDRESS
    this.dataDir = dataDir || DEFAULT_DATA_DIR
    this.marketNames = marketNames || []
    this.interchainRouterAddress = interchainRouterAddress || DEFAULT_INTERCHAIN_ROUTER_ADDRESS
    this.relayerRpcHost = relayerRpcHost || DEFAULT_RELAYER_HOST
    this.relayerCertPath = relayerCertPath

    this.logger = logger
    this.store = sublevel(level(this.dataDir))
    this.eventHandler = new EventEmitter()
    this.relayer = new RelayerClient(idKeyPath, { host: this.relayerRpcHost, certPath: this.relayerCertPath }, this.logger)

    this.engines = new Map(Object.entries(engines || {}).map(([ symbol, engineConfig ]) => {
      return [ symbol, createEngineFromConfig(symbol, engines[symbol], { logger: this.logger }) ]
    }))

    this.orderbooks = new Map()

    this.blockOrderWorker = new BlockOrderWorker({
      relayer: this.relayer,
      engines: this.engines,
      orderbooks: this.orderbooks,
      store: this.store.sublevel('block-orders'),
      logger: this.logger
    })

    this.rpcServer = new BrokerRPCServer({
      logger: this.logger,
      engines: this.engines,
      relayer: this.relayer,
      orderbooks: this.orderbooks,
      blockOrderWorker: this.blockOrderWorker
    })

    this.interchainRouter = new InterchainRouter({
      ordersByHash: this.blockOrderWorker.ordersByHash,
      logger: this.logger,
      engines: this.engines
    })
  }

  /**
   * Initialize the broker daemon which:
   * - Sets up the orderbooks (listens to market events on the Relayer, re-indexes data store)
   * - Sets up the BlockOrderWorker (re-indexing the orders)
   * - Validates engine configuration
   * - Sets up the user-facing RPC Server
   * - Sets up the Interchain Router
   * @return {Promise}
   */
  async initialize () {
    try {
      // Since these are potentially long-running operations, we run them in parallel to speed
      // up BrokerDaemon startup time.
      await Promise.all([
        this.initializeMarkets(this.marketNames),
        (async () => {
          this.logger.info(`Initializing BlockOrderWorker`)
          await this.blockOrderWorker.initialize()
          this.logger.info('BlockOrderWorker initialized')
        })(),
        ...Array.from(this.engines, async ([ symbol, engine ]) => {
          this.logger.info(`Validating engine configuration for ${symbol}`)
          await engine.validateNodeConfig()
          this.logger.info(`Validated engine configuration for ${symbol}`)
        })
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
   * Creates and initializes an orderbook for every market
   *
   * @param {String} marketName
   * @returns {Promise<void>} promise that resolves when market is caught up to the remote
   */
  async initializeMarket (marketName) {
    const symbols = marketName.split('/')
    if (!symbols.every(sym => CONFIG.currencies.find(({ symbol }) => symbol === sym.toUpperCase()))) {
      throw new Error(`Currency config is required for both symbols of ${marketName}`)
    }

    if (!symbols.every(sym => !!this.engines.get(sym))) {
      throw new Error(`An engine is required for both symbols of ${marketName}`)
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
