const GrpcServer = require('./grpc-server')

/**
 * Interface for the KBD client
 *
 * @NOTE: the method signature is from the #action mathod in Caporal
 * @param {Object} args
 * @param {Object} opts
 * @param {Logger} logger
 */

function startServer (args, opts, logger) {
  const {
    rpcAddress
    // dataDir,
    // engineType,
    // exchangeHost,
    // lndRpc,
    // lndTls,
    // lndMacaroon
  } = opts

  try {
    const grpc = new GrpcServer(logger)
    grpc.listen(rpcAddress)
    logger.info(`gRPC server started: Server listening on ${rpcAddress}`)
  } catch (e) {
    logger.error(e.toString())
    throw (e)
  }
}

module.exports = startServer
