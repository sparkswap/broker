/**
 * Kinesis Broker Daemon
 */

const program = require('caporal')

const BrokerDaemon = require('../')
const { currencies } = require('../config')

// TODO: Change this path to be KBD specific
const { validations } = require('../../broker-cli/utils')

const { version: CLI_VERSION } = require('../../package.json')

// KBD Specific ENV variables
const {
  RPC_ADDRESS,
  DATA_DIR,
  RELAYER_RPC_HOST,
  MARKETS,
  INTERCHAIN_ROUTER_ADDRESS
} = process.env

// TODO: Add validations to ./bin/kbd when they become available
program
  .version(CLI_VERSION)
  .option('--rpc-address <server>', 'Add a host/port to listen for daemon RPC connections', validations.isHost, RPC_ADDRESS)
  .option('--interchain-router-address <server>', 'Add a host/port to listen for interchain router RPC connections', validations.isHost, INTERCHAIN_ROUTER_ADDRESS)
  .option('--data-dir <path>', 'Location to store kinesis data', validations.isFormattedPath, DATA_DIR)
  .option('--markets <markets>', 'Comma-separated market names to track on startup', validations.areValidMarketNames, MARKETS)
  .option('--relayer-host', 'The host address for the Kinesis Relayer', validations.isHost, RELAYER_RPC_HOST)

for (let currency of currencies) {
  let lowerSymbol = currency.symbol.toLowerCase()
  let ENGINE_TYPE = process.env[`${currency.symbol}_ENGINE_TYPE`]
  let LND_TLS_CERT = process.env[`${currency.symbol}_LND_TLS_CERT`]
  let LND_MACAROON = process.env[`${currency.symbol}_LND_MACAROON`]
  let LND_RPC_HOST = process.env[`${currency.symbol}_LND_RPC_HOST`]
  program
    .option(`--${lowerSymbol}-engine-type <type>`, `The type of underlying Lightning node for ${currency.name}`, [ 'LND' ], ENGINE_TYPE)
  // LND Specific commands
  // These will be validated based off of the engine type
  program
    .option(`--${lowerSymbol}-lnd-rpc <server>`, `Location of the LND RPC server to use for ${currency.name}.`, validations.isHost, LND_RPC_HOST)
    .option(`--${lowerSymbol}-lnd-tls <path>`, `Location of the certificate to use when communicating with ${currency.name} LND.`, validations.isFormattedPath, LND_TLS_CERT)
    .option(`--${lowerSymbol}-lnd-macaroon <path>`, `Location of the macaroon to use when communicating with ${currency.name} LND.`, validations.isFormattedPath, LND_MACAROON)
}

program
  .action((args, opts) => {
    const {
      rpcAddress,
      dataDir,
      markets,
      interchainRouterAddress,
      relayerHost
    } = opts

    const engines = {}

    for (let currency of currencies) {
      let lowerSymbol = currency.symbol.toLowerCase()
      if (opts[`${lowerSymbol}EngineType`] === 'LND') {
        engines[currency.symbol] = {
          type: 'LND',
          lndRpc: opts[`${lowerSymbol}LndRpc`],
          lndTls: opts[`${lowerSymbol}LndTls`],
          lndMacaroon: opts[`${lowerSymbol}LndMacaroon`]
        }
      }
    }

    const marketNames = (markets || '').split(',').filter(m => m)

    console.log('rpcAddress', rpcAddress)

    const brokerDaemon = new BrokerDaemon(rpcAddress, interchainRouterAddress, relayerHost, dataDir, marketNames, engines)
    brokerDaemon.initialize()
    return brokerDaemon
  })

module.exports = (argv) => program.parse(argv)
