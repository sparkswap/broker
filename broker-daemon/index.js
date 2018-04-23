const GrpcServer = require('./grpc-server')

/**
 * Creates an RPC server with params from kbd cli
 *
 * @param {Object} args
 * @param {Object} opts
 * @param {String} opts.rpcAddress
 * @param {String} opts.dataDir
 * @param {String} opts.engineType
 * @param {String} opts.exchangeHost
 * @param {String} [lndRpc] opts.lndRpc
 * @param {String} [lndTls] opts.lndTls
 * @param {String} [lndMacaroon] opts.lndMacaroon
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
  }
}

module.exports = startServer
