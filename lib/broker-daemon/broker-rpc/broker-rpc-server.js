const grpc = require('grpc');
const path = require('path');
const { readFileSync } = require('fs');
const AdminService = require('./admin-service');
const OrderService = require('./order-service');
const OrderBookService = require('./orderbook-service');
const WalletService = require('./wallet-service');
const InfoService = require('./info-service');
const { createBasicAuth, createHttpServer } = require('../utils');
const BROKER_PROTO_PATH = './broker-daemon/proto/broker.proto';
const IS_PRODUCTION = (process.env.NODE_ENV === 'production');
const HTTP_PORT = '27592';
const DEFAULT_RPC_ADDRESS = '0.0.0.0:27492';
class BrokerRPCServer {
    constructor({ logger, engines, relayer, blockOrderWorker, orderbooks, pubKeyPath, privKeyPath, disableAuth = false, enableCors = false, rpcUser = null, rpcPass = null } = {}) {
        this.logger = logger;
        this.engines = engines;
        this.relayer = relayer;
        this.blockOrderWorker = blockOrderWorker;
        this.orderbooks = orderbooks;
        this.pubKeyPath = pubKeyPath;
        this.privKeyPath = privKeyPath;
        this.disableAuth = disableAuth;
        this.auth = createBasicAuth(rpcUser, rpcPass, disableAuth);
        this.protoPath = path.resolve(BROKER_PROTO_PATH);
        this.server = new grpc.Server();
        this.httpServer = createHttpServer(this.protoPath, DEFAULT_RPC_ADDRESS, { disableAuth, enableCors, privKeyPath, pubKeyPath, logger });
        this.adminService = new AdminService(this.protoPath, { logger, relayer, engines, orderbooks, auth: this.auth });
        this.server.addService(this.adminService.definition, this.adminService.implementation);
        this.orderService = new OrderService(this.protoPath, { logger, blockOrderWorker, auth: this.auth });
        this.server.addService(this.orderService.definition, this.orderService.implementation);
        this.orderBookService = new OrderBookService(this.protoPath, { logger, relayer, orderbooks, auth: this.auth });
        this.server.addService(this.orderBookService.definition, this.orderBookService.implementation);
        this.walletService = new WalletService(this.protoPath, { logger, engines, relayer, orderbooks, blockOrderWorker, auth: this.auth });
        this.server.addService(this.walletService.definition, this.walletService.implementation);
        this.infoService = new InfoService(this.protoPath, { logger, engines, relayer, orderbooks });
        this.server.addService(this.infoService.definition, this.infoService.implementation);
    }
    listen(host) {
        if (IS_PRODUCTION && this.disableAuth) {
            throw new Error(`Cannot disable TLS in production. Set DISABLE_AUTH to FALSE.`);
        }
        const rpcCredentials = this.createCredentials();
        this.server.bind(host, rpcCredentials);
        this.server.start();
        this.httpServer.listen(HTTP_PORT, () => {
            const protocol = this.disableAuth ? 'http' : 'https';
            this.logger.info(`Listening on ${protocol}://0.0.0.0:${HTTP_PORT}`);
        });
    }
    createCredentials() {
        if (this.disableAuth) {
            this.logger.warn('DISABLE_AUTH is set to TRUE. Connections to the broker will be unencrypted. This is suitable only in development.');
            return grpc.ServerCredentials.createInsecure();
        }
        const key = readFileSync(this.privKeyPath);
        const cert = readFileSync(this.pubKeyPath);
        this.logger.debug(`Securing gRPC connections with TLS: key: ${this.privKeyPath}, cert: ${this.pubKeyPath}`);
        return grpc.ServerCredentials.createSsl(null, [{
                private_key: key,
                cert_chain: cert
            }], false);
    }
}
module.exports = BrokerRPCServer;
//# sourceMappingURL=broker-rpc-server.js.map