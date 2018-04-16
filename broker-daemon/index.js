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
    const grpc = new GrpcServer(logger);
    grpc.listen(rpcAddress);
    logger.info(`gRPC server started: Server listening on ${rpcAddress}`);
  } catch(e) {
    logger.error(e.toString());
    throw(e);
  }
}

module.exports = startServer;
