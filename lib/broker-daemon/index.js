require('source-map-support').install();
const level = require('level');
const sublevel = require('level-sublevel');
const EventEmitter = require('events');
const LndEngine = require('lnd-engine');
const RelayerClient = require('./relayer');
const Orderbook = require('./orderbook');
const BlockOrderWorker = require('./block-order-worker');
const BrokerRPCServer = require('./broker-rpc/broker-rpc-server');
const InterchainRouter = require('./interchain-router');
const { logger } = require('./utils');
const CONFIG = require('./config');
const DEFAULT_RPC_ADDRESS = '0.0.0.0:27492';
const DEFAULT_DATA_DIR = '~/.sparkswap/data';
const DEFAULT_INTERCHAIN_ROUTER_ADDRESS = '0.0.0.0:40369';
const DEFAULT_RELAYER_HOST = 'localhost:28492';
function createEngineFromConfig(symbol, engineConfig, { logger }) {
    if (engineConfig.type === 'LND') {
        return new LndEngine(engineConfig.lndRpc, symbol, {
            logger,
            tlsCertPath: engineConfig.lndTls,
            macaroonPath: engineConfig.lndMacaroon
        });
    }
    else {
        throw new Error(`Unknown engine type of ${engineConfig.type} for ${symbol}`);
    }
}
class BrokerDaemon {
    constructor({ privRpcKeyPath, pubRpcKeyPath, privIdKeyPath, pubIdKeyPath, rpcAddress, interchainRouterAddress, dataDir, marketNames, engines, disableAuth = false, rpcUser = null, rpcPass = null, relayerOptions = {} }) {
        if (!privIdKeyPath)
            throw new Error('Private Key path is required to create a BrokerDaemon');
        if (!pubIdKeyPath)
            throw new Error('Public Key path is required to create a BrokerDaemon');
        const { relayerRpcHost, relayerCertPath } = relayerOptions;
        this.idKeyPath = {
            privKeyPath: privIdKeyPath,
            pubKeyPath: pubIdKeyPath
        };
        this.rpcAddress = rpcAddress || DEFAULT_RPC_ADDRESS;
        this.dataDir = dataDir || DEFAULT_DATA_DIR;
        this.marketNames = marketNames || [];
        this.interchainRouterAddress = interchainRouterAddress || DEFAULT_INTERCHAIN_ROUTER_ADDRESS;
        this.disableAuth = disableAuth;
        this.rpcUser = rpcUser;
        this.rpcPass = rpcPass;
        this.relayerRpcHost = relayerRpcHost || DEFAULT_RELAYER_HOST;
        this.relayerCertPath = relayerCertPath;
        this.logger = logger;
        this.store = sublevel(level(this.dataDir));
        this.eventHandler = new EventEmitter();
        this.relayer = new RelayerClient(this.idKeyPath, { host: this.relayerRpcHost, certPath: this.relayerCertPath }, this.logger);
        this.engines = new Map(Object.entries(engines || {}).map(([symbol, engineConfig]) => {
            return [symbol, createEngineFromConfig(symbol, engines[symbol], { logger: this.logger })];
        }));
        this.orderbooks = new Map();
        this.blockOrderWorker = new BlockOrderWorker({
            relayer: this.relayer,
            engines: this.engines,
            orderbooks: this.orderbooks,
            store: this.store.sublevel('block-orders'),
            logger: this.logger
        });
        this.rpcServer = new BrokerRPCServer({
            logger: this.logger,
            engines: this.engines,
            relayer: this.relayer,
            orderbooks: this.orderbooks,
            blockOrderWorker: this.blockOrderWorker,
            privKeyPath: privRpcKeyPath,
            pubKeyPath: pubRpcKeyPath,
            disableAuth,
            rpcUser,
            rpcPass
        });
        this.interchainRouter = new InterchainRouter({
            ordersByHash: this.blockOrderWorker.ordersByHash,
            logger: this.logger,
            engines: this.engines
        });
    }
    async initialize() {
        try {
            await Promise.all([
                this.initializeMarkets(this.marketNames),
                (async () => {
                    this.logger.info(`Initializing BlockOrderWorker`);
                    await this.blockOrderWorker.initialize();
                    this.logger.info('BlockOrderWorker initialized');
                })()
            ]);
            this.validateEngines();
            this.rpcServer.listen(this.rpcAddress);
            this.logger.info(`BrokerDaemon RPC server started: gRPC Server listening on ${this.rpcAddress}`);
            this.interchainRouter.listen(this.interchainRouterAddress);
            this.logger.info(`Interchain Router server started: gRPC Server listening on ${this.interchainRouterAddress}`);
        }
        catch (e) {
            this.logger.error('BrokerDaemon failed to initialize', { error: e.stack });
            this.logger.error(e.toString(), e);
            this.logger.info('BrokerDaemon shutting down...');
            process.exit(1);
        }
    }
    async initializeMarkets(markets) {
        this.logger.info(`Initializing ${markets.length} markets`);
        await Promise.all(markets.map((marketName) => {
            return this.initializeMarket(marketName);
        }));
        this.logger.info(`Caught up to ${markets.length} markets`);
    }
    async initializeMarket(marketName) {
        const symbols = marketName.split('/');
        if (!symbols.every(sym => CONFIG.currencies.find(({ symbol }) => symbol === sym.toUpperCase()))) {
            throw new Error(`Currency config is required for both symbols of ${marketName}`);
        }
        if (!symbols.every(sym => !!this.engines.get(sym))) {
            throw new Error(`An engine is required for both symbols of ${marketName}`);
        }
        if (this.orderbooks.get(marketName)) {
            this.logger.warn(`initializeMarket: Already have an orderbook for ${marketName}, skipping.`);
            return;
        }
        this.orderbooks.set(marketName, new Orderbook(marketName, this.relayer, this.store.sublevel(marketName), this.logger));
        return this.orderbooks.get(marketName).initialize();
    }
    validateEngines() {
        this.engines.forEach((engine, _) => engine.validateEngine());
    }
}
module.exports = BrokerDaemon;
//# sourceMappingURL=index.js.map