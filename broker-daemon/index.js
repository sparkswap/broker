const level = require('level')
const sublevel = require('level-sublevel')
const EventEmitter = require('events')
const LndEngine = require('lnd-engine')

const RelayerClient = require('./relayer')
const Orderbook = require('./orderbook')
const BlockOrderWorker = require('./block-order-worker')
const BrokerRPCServer = require('./broker-rpc/broker-rpc-server')
const { logger } = require('./utils')
const CONFIG = require('./config.json')

/** @typedef {import('lnd-engine')} Engine */
/** @typedef {object} Logger */
/** @typedef {object} GrpcServerStreaming */
/** @typedef {object} GrpcMetadata */

/**
 * Default host and port for the BrokerRPCServer to listen on
 *
 * @constant
 * @type {string}
 * @default
 */
const DEFAULT_RPC_ADDRESS = '0.0.0.0:27492'

/**
 * Default file path to store broker data
 *
 * @constant
 * @type {string}
 * @default
 */
const DEFAULT_DATA_DIR = '~/.sparkswap/data'

/**
 * Default host and port that the Relayer is set up on
 *
 * @constant
 * @type {string}
 * @default
 */
const DEFAULT_RELAYER_HOST = 'localhost:28492'

/**
 * Create an instance of an engine from provided configuration
 * @param {string} symbol         - Symbol that this engine is responsible for
 * @param {object} engineConfig   - Configuration object for this engine
 * @param {object} options
 * @param {Logger} options.logger - Logger that this engine should use
 * @returns {Engine}
 * @throws {Error} Unknown engine type
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
 * @class BrokerDaemon is a collection of services to allow a user to run a broker on the SparkSwap Network.
 * It exposes a user-facing RPC server, watches markets on the relayer, and works
 * block orders in the background.
 */
class BrokerDaemon {
  /**
   * @param {object} opts
   * @param {string} opts.network - current blockchain network of the daemon
   * @param {string} opts.privRpcKeyPath
   * @param {string} opts.pubRpcKeyPath
   * @param {string} opts.privIdKeyPath - Path to private key for broker's identity
   * @param {string} opts.pubIdKeyPath - Path to public key for broker's identity
   * @param {string} opts.rpcAddress - Host and port where the user-facing RPC server should listen
   * @param {string} opts.dataDir - Relative path to a directory where application data should be stored
   * @param {Array}  opts.marketNames - List of market names (e.g. 'BTC/LTC') to support
   * @param {object} opts.engines - Configuration for all the engines to instantiate
   * @param {boolean} [opts.disableAuth=false] - Disable SSL for the daemon
   * @param {boolean} [opts.enableCors=false] - Enable CORS for the HTTP Proxy
   * @param {boolean} opts.isCertSelfSigned
   * @param {?string} [opts.rpcUser] - RPC username, only used when auth is enabled
   * @param {?string} [opts.rpcPass] - RPC password, only used when auth is enabled
   * @param {object} opts.relayerOptions
   * @param {string} opts.relayerOptions.relayerRpcHost - Host and port for the Relayer RPC
   * @param {string} opts.relayerOptions.relayerCertPath - Absolute path to the root certificate for the relayer
   * @param {string} opts.rpcInternalProxyAddress
   * @param {string} opts.rpcHttpProxyAddress
   * @param {Array<string>} opts.rpcHttpProxyMethods
   */
  constructor ({ network, privRpcKeyPath, pubRpcKeyPath, privIdKeyPath, pubIdKeyPath, rpcAddress, dataDir, marketNames, engines, disableAuth = false, enableCors = false, isCertSelfSigned, rpcUser = null, rpcPass = null, relayerOptions, rpcInternalProxyAddress, rpcHttpProxyAddress, rpcHttpProxyMethods }) {
    // Set a global namespace for sparkswap that we can use for properties not
    // related to application configuration
    // @ts-ignore
    if (!global.sparkswap) {
      // @ts-ignore
      global.sparkswap = {}
    }

    if (!network) throw new Error('Network is required to create a BrokerDaemon')
    if (!privIdKeyPath) throw new Error('Private Key path is required to create a BrokerDaemon')
    if (!pubIdKeyPath) throw new Error('Public Key path is required to create a BrokerDaemon')

    // Set the network in the global sparkswap namespace
    // @ts-ignore
    global.sparkswap.network = network

    const { relayerRpcHost, relayerCertPath } = relayerOptions

    this.idKeyPath = {
      privKeyPath: privIdKeyPath,
      pubKeyPath: pubIdKeyPath
    }
    this.rpcAddress = rpcAddress || DEFAULT_RPC_ADDRESS
    this.rpcInternalProxyAddress = rpcInternalProxyAddress || `localhost:${this.rpcAddress.split(':')[1]}`
    this.rpcHttpProxyAddress = rpcHttpProxyAddress
    this.dataDir = dataDir || DEFAULT_DATA_DIR
    this.marketNames = marketNames || []
    this.disableAuth = disableAuth
    this.rpcUser = rpcUser
    this.rpcPass = rpcPass
    this.relayerRpcHost = relayerRpcHost || DEFAULT_RELAYER_HOST
    this.relayerCertPath = relayerCertPath

    this.logger = logger
    this.store = sublevel(level(this.dataDir))
    this.eventHandler = new EventEmitter()
    this.relayer = new RelayerClient(this.idKeyPath, { host: this.relayerRpcHost, certPath: this.relayerCertPath }, this.logger)

    this.engines = new Map(Object.entries(engines || {}).map(([ symbol, _engineConfig ]) => {
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
      rpcAddress: this.rpcInternalProxyAddress,
      rpcHttpProxyAddress: this.rpcHttpProxyAddress,
      rpcHttpProxyMethods,
      logger: this.logger,
      engines: this.engines,
      relayer: this.relayer,
      orderbooks: this.orderbooks,
      blockOrderWorker: this.blockOrderWorker,
      store: this.store,
      privKeyPath: privRpcKeyPath,
      pubKeyPath: pubRpcKeyPath,
      disableAuth,
      enableCors,
      isCertSelfSigned,
      rpcUser,
      rpcPass
    })
  }

  /**
   * Initialize the broker daemon which:
   * - Sets up the orderbooks (listens to market events on the Relayer, re-indexes data store)
   * - Sets up the BlockOrderWorker (re-indexing the orders)
   * - Validates engine configuration
   * - Sets up the user-facing RPC Server
   */
  async initialize () {
    try {
      // Starts the validation of all engines on the broker. We do not await this
      // function because we want the validations to run in the background as it
      // can take time for the engines to be ready
      const enginesAreValidated = this.validateEngines()

      // Since these are potentially long-running operations, we run them in parallel to speed
      // up BrokerDaemon startup time.
      await Promise.all([
        this.initializeMarkets(this.marketNames),
        this.initializeBlockOrder(enginesAreValidated)
      ])

      this.rpcServer.listen(this.rpcAddress)
      this.logger.info(`BrokerDaemon RPC server started: gRPC Server listening on ${this.rpcAddress}`)
    } catch (e) {
      this.logger.error('BrokerDaemon failed to initialize', { error: e.stack })
      this.logger.error(e.toString(), e)
      this.logger.info('BrokerDaemon shutting down...')
      process.exit(1)
    }
  }

  /**
   * Initializes all block orders for the engine.
   * @param {Promise} enginesAreValidated - a promise that resolves when engines are validated
   * @returns {Promise<void>}
   */
  async initializeBlockOrder (enginesAreValidated) {
    this.logger.info(`Initializing BlockOrderWorker`)
    await this.blockOrderWorker.initialize(enginesAreValidated)
    this.logger.info('BlockOrderWorker initialized')
    return undefined
  }

  /**
   * Listens to the assigned markets
   *
   * @param {Array<string>} markets
   * @returns {Promise<void>} promise that resolves when markets are caught up to the remote
   * @throws {Error} If markets include a currency with no currency configuration
   */
  async initializeMarkets (markets) {
    this.logger.info(`Initializing ${markets.length} markets`)
    await Promise.all(markets.map((marketName) => {
      return this.initializeMarket(marketName)
    }))
    this.logger.info(`Caught up to ${markets.length} markets`)
    return undefined
  }

  /**
   * Creates and initializes an orderbook for every market
   *
   * @param {string} marketName
   * @returns {Promise<void>} promise that resolves when market is caught up to the remote
   */
  async initializeMarket (marketName) {
    const symbols = marketName.split('/')
    if (!symbols.every(sym =>
      CONFIG.currencies.find(({ symbol }) => symbol === sym.toUpperCase()) !== undefined)) {
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

  /**
   * Validates engines
   * @returns {Promise<Array<void>>}
   */
  validateEngines () {
    return Promise.all(
      Array.from(this.engines).map(([ _, engine ]) => engine.validateEngine())
    )
  }
}

module.exports = BrokerDaemon
