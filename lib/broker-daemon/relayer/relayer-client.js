const path = require('path');
const { readFileSync } = require('fs');
const { credentials } = require('grpc');
const caller = require('grpc-caller');
const Identity = require('./identity');
const MarketWatcher = require('./market-watcher');
const { loadProto } = require('../utils');
const consoleLogger = console;
consoleLogger.debug = console.log.bind(console);
const RELAYER_PROTO_PATH = './proto/relayer.proto';
class RelayerClient {
    constructor({ privKeyPath, pubKeyPath }, { certPath, host = 'localhost:28492' }, logger = consoleLogger) {
        this.logger = logger;
        this.address = host;
        this.proto = loadProto(path.resolve(RELAYER_PROTO_PATH));
        this.identity = Identity.load(privKeyPath, pubKeyPath);
        let channelCredentials;
        if (process.env.NETWORK === 'mainnet') {
            channelCredentials = credentials.createSsl();
        }
        else {
            channelCredentials = credentials.createSsl(readFileSync(certPath));
        }
        const callCredentials = credentials.createFromMetadataGenerator(({ service_url }, callback) => {
            callback(null, this.identity.identify());
        });
        this.credentials = credentials.combineChannelCredentials(channelCredentials, callCredentials);
        this.makerService = caller(this.address, this.proto.MakerService, this.credentials);
        this.takerService = caller(this.address, this.proto.TakerService, this.credentials);
        this.healthService = caller(this.address, this.proto.HealthService, this.credentials);
        this.orderbookService = caller(this.address, this.proto.OrderBookService, this.credentials);
        this.paymentChannelNetworkService = caller(this.address, this.proto.PaymentChannelNetworkService, this.credentials);
        this.infoService = caller(this.address, this.proto.InfoService, this.credentials);
    }
    watchMarket(store, { baseSymbol, counterSymbol, lastUpdated, sequence }) {
        const RESPONSE_TYPES = this.proto.WatchMarketResponse.ResponseType;
        const params = {
            baseSymbol,
            counterSymbol,
            lastUpdated,
            sequence
        };
        this.logger.info('Setting up market watcher', params);
        const watcher = this.orderbookService.watchMarket(params);
        return new MarketWatcher(watcher, store, RESPONSE_TYPES, this.logger);
    }
}
module.exports = RelayerClient;
//# sourceMappingURL=relayer-client.js.map