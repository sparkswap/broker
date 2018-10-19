/**
 * SparkSwap Broker Daemon
 */

const program = require('caporal')

const BrokerDaemon = require('../')
const { currencies } = require('../config')

// TODO: Change this path to be sparkswapd specific
const { validations } = require('../../broker-cli/utils')

const { version: CLI_VERSION } = require('../../package.json')

// sparkswapd Specific ENV variables
const {
  RPC_ADDRESS,
  DATA_DIR,
  RELAYER_RPC_HOST,
  RELAYER_CERT_PATH,
  MARKETS,
  INTERCHAIN_ROUTER_ADDRESS,
  ID_PRIV_KEY,
  ID_PUB_KEY,
  DISABLE_AUTH,
  DISABLE_RELAYER_AUTH,
  RPC_PRIV_KEY,
  RPC_PUB_KEY,
  RPC_USER,
  RPC_PASS
} = process.env

// TODO: Add validations to ./bin/sparkswapd when they become available
program
  .version(CLI_VERSION)
  .option('--rpc-address <server>', 'Add a host/port to listen for daemon RPC connections', validations.isHost, RPC_ADDRESS)
  .option('--interchain-router-address <server>', 'Add a host/port to listen for interchain router RPC connections', validations.isHost, INTERCHAIN_ROUTER_ADDRESS)
  .option('--data-dir <path>', 'Location to store SparkSwap data', validations.isFormattedPath, DATA_DIR)
  .option('--disable-auth', 'Disable SSL for the broker (DEV ONLY)', program.BOOL, DISABLE_AUTH)
  .option('--rpc-user', 'Rpc user name, used when auth is enabled', program.String, RPC_USER)
  .option('--rpc-pass', 'Rpc password, used when auth is enabled', program.String, RPC_PASS)
  .option('--rpc-privkey-path <path>', 'Location of private key for the broker\'s rpc', validations.isFormattedPath, RPC_PRIV_KEY)
  .option('--rpc-pubkey-path <path>', 'Location of the public key for the broker\'s rpc', validations.isFormattedPath, RPC_PUB_KEY)
  .option('--disable-relayer-auth', 'Disable SSL and message signing to the relayer (DEV ONLY)', program.BOOL, DISABLE_RELAYER_AUTH)
  .option('--id-privkey-path <path>', 'Location of private key for the broker\'s identity', validations.isFormattedPath, ID_PRIV_KEY)
  .option('--id-pubkey-path <path>', 'Location of the public key for the broker\'s identity', validations.isFormattedPath, ID_PUB_KEY)
  .option('--markets <markets>', 'Comma-separated market names to track on startup', validations.areValidMarketNames, MARKETS)
  .option('--relayer-host <server>', 'The host address for the SparkSwap Relayer', validations.isHost, RELAYER_RPC_HOST)
  .option('--relayer-cert-path <path>', 'Location of the root certificate for the SparkSwap Relayer', validations.isFormattedPath, RELAYER_CERT_PATH)

for (let currency of currencies) {
  let lowerSymbol = currency.symbol.toLowerCase()
  let ENGINE_TYPE = process.env[`${currency.symbol}_ENGINE_TYPE`]
  let LND_TLS_CERT = process.env[`${currency.symbol}_LND_TLS_CERT`]
  let LND_MACAROON = process.env[`${currency.symbol}_LND_MACAROON`]
  let LND_RPC_HOST = process.env[`${currency.symbol}_LND_RPC_HOST`]
  program
    .option(`--${lowerSymbol}-engine-type <type>`, `The type of underlying Payment Channel Network node for ${currency.name}`, [ 'LND' ], ENGINE_TYPE)
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
      relayerHost: relayerRpcHost,
      relayerCertPath,
      idPrivkeyPath: privIdKeyPath,
      idPubkeyPath: pubIdKeyPath,
      disableAuth,
      rpcPrivkeyPath: privRpcKeyPath,
      rpcPubkeyPath: pubRpcKeyPath,
      rpcUser,
      rpcPass
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

    const brokerOptions = {
      pubRpcKeyPath,
      privRpcKeyPath,
      privIdKeyPath,
      pubIdKeyPath,
      rpcAddress,
      interchainRouterAddress,
      dataDir,
      marketNames,
      engines,
      disableAuth,
      rpcUser,
      rpcPass,
      relayerOptions: {
        relayerRpcHost,
        relayerCertPath
      }
    }
    return new BrokerDaemon(brokerOptions).initialize()
  })

module.exports = (argv) => program.parse(argv)
