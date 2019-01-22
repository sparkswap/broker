const express = require('express');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const https = require('https');
const fs = require('fs');
const grpc = require('grpc');
const grpcGateway = require('../built/grpc-gateway').default;
const corsMiddleware = require('./enable-cors');
function createHttpServer(protoPath, rpcAddress, { disableAuth = false, enableCors = false, privKeyPath, pubKeyPath, logger }) {
    const app = express();
    app.use(helmet());
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: false }));
    if (enableCors) {
        app.use(corsMiddleware());
    }
    if (disableAuth) {
        app.use('/', grpcGateway([`/${protoPath}`], rpcAddress));
    }
    else {
        const key = fs.readFileSync(privKeyPath);
        const cert = fs.readFileSync(pubKeyPath);
        const channelCredentials = grpc.credentials.createSsl(cert);
        if (rpcAddress.includes('0.0.0.0')) {
            rpcAddress = rpcAddress.replace('0.0.0.0', 'localhost');
        }
        app.use('/', grpcGateway([`/${protoPath}`], rpcAddress, channelCredentials));
        logger.debug(`Securing http RPC connections with TLS: key: ${privKeyPath}, cert: ${pubKeyPath}`);
        return https.createServer({ key, cert }, app);
    }
    app.use((req, res, _next) => {
        logger.debug('Received request but had no route', { url: req.url });
        res.status(404).send('404');
    });
    return app;
}
module.exports = createHttpServer;
//# sourceMappingURL=create-http-server.js.map