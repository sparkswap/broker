const GrpcServer = require('./grpc-server');

function startServer(args, opts, logger) {
  const {
    rpcAddress,
    ports,
    externalHost,
    dataDir,
    lndRpc,
    lndTls,
    lndMacaroon,
  } = opts;

  try {
    const grpc = new GrpcServer();
    grpc.listen(rpcAddress);
  } catch(e) {
    logger.error(e.toString());
    throw(e);
  }
}

module.exports = startServer;
