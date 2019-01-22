const grpc = require('grpc');
const path = require('path');
const ExternalPreimageService = require('./external-preimage-service');
const PROTO_PATH = path.resolve(__dirname, 'rpc.proto');
class InterchainRouter {
    constructor({ ordersByHash, logger, engines }) {
        this.ordersByHash = ordersByHash;
        this.logger = logger;
        this.server = new grpc.Server();
        this.engines = engines;
        this.externalPreimageService = new ExternalPreimageService(PROTO_PATH, { ordersByHash, logger, engines });
        this.server.addService(this.externalPreimageService.definition, this.externalPreimageService.implementation);
    }
    listen(host) {
        this.server.bind(host, grpc.ServerCredentials.createInsecure());
        this.server.start();
    }
}
module.exports = InterchainRouter;
//# sourceMappingURL=index.js.map