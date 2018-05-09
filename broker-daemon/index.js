const level = require('level')
const sublevel = require('level-sublevel')
const EventEmitter = require('events')

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
 * @param {String} opts.markets
 * @param {String} [lndRpc] opts.lndRpc
 * @param {String} [lndTls] opts.lndTls
 * @param {String} [lndMacaroon] opts.lndMacaroon
 * @param {Logger} logger
 */

async function startServer (args, opts, logger) {
  const {
    rpcAddress,
    dataDir,
    markets
    // engineType,
    // exchangeHost,
    // lndRpc,
    // lndTls,
    // lndMacaroon
  } = opts

  const store = sublevel(level(dataDir))
  const eventHandler = new EventEmitter()
  const grpc = new GrpcServer(logger, store, eventHandler)

  const marketNames = (markets || '').split(',')
  logger.info(`Initializing ${marketNames.length} markets`)
  await grpc.initializeMarkets(marketNames)
  logger.info(`Caught up to ${marketNames.length} markets`)

  grpc.listen(rpcAddress)
  logger.info(`gRPC server started: Server listening on ${rpcAddress}`)
}

module.exports = startServer
