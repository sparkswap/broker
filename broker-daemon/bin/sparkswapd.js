/**
 * SparkSwap Broker Daemon
 */

const program = require('caporal')

const BrokerDaemon = require('../')
const config = require('../config')
const { currencies } = config
const { version: CLI_VERSION } = require('../../package.json')

// TODO: Change this path to be sparkswapd specific
const { validations } = require('../../broker-cli/utils')

// LND currently uses ECDSA generated certs, which we use on the broker. We've
// add ECDSA to the gRPC cipher suites as it is not added by default.
// If this line is removed, we will see an SSL Handshake Error stating `no shared cipher`
process.env.GRPC_SSL_CIPHER_SUITES = 'HIGH+ECDSA:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384'

/**
 * Caporal Validation for checking valid engine types
 * @param {string} engineType
 */
function isSupportedEngineType (engineType = '') {
  const { supportedEngineTypes = [] } = config

  if (supportedEngineTypes.includes(engineType.toUpperCase())) {
    return engineType.toUpperCase()
  }

  throw new Error(`Invalid engine type: ${engineType}`)
}

// TODO: Add validations to ./bin/sparkswapd when they become available
program
  .version(CLI_VERSION)
  // Broker configuration options
  .option('--data-dir [data-dir]', 'Location to store SparkSwap data', validations.isFormattedPath, config.dataDir)
  .option('--network [network]', 'The current blockchain network. (mainnet, testnet, or regtest)', validations.isBlockchainNetwork, null, true)
  .option('--interchain-router-address [interchain-router-address]', 'Add a host/port to listen for interchain router RPC connections', validations.isHost, config.interchainRouterAddress)
  .option('--id-pub-key-path [id-pub-key-path]', 'Location of the public key for the broker\'s identity', validations.isFormattedPath, config.idPubKeyPath)
  .option('--id-priv-key-path [id-priv-key-path]', 'Location of private key for the broker\'s identity', validations.isFormattedPath, config.idPrivKeyPath)
  // TODO: Make this a list instead of string
  .option('--markets [markets]', 'Comma-separated market names to track on startup', validations.areValidMarketNames, config.markets)
  .option('--disable-auth [disable-auth]', 'Disable SSL for the broker (DEV ONLY)', program.BOOL, config.disableAuth)
  // Relayer configuration options
  .option('--relayer.rpc-host [rpc-host]', 'The host address for the SparkSwap Relayer', validations.isHost, config.relayer.rpcHost)
  .option('--relayer.cert-path [cert-path]', 'Location of the root certificate for the SparkSwap Relayer (only used in development)', validations.isFormattedPath, config.relayer.certPath)
  // Broker RPC configuration options
  .option('--rpc.address [rpc-address]', 'Add a host/port to listen for daemon RPC connections', validations.isHost, config.rpc.address)
  .option('--rpc.proxy-address [rpc-proxy-address]', 'Add a host/port where the daemon RPC will be reachable', validations.isHost, config.rpc.proxyAddress)
  .option('--rpc.http-proxy-address [rpc-http-proxy-address]', 'Add a host/port to listen for HTTP RPC proxy connections', validations.isHost, config.rpc.httpProxyAddress)
  .option('--rpc.http-proxy-methods [rpc-http-proxy-methods]', 'Comma-separated methods for the HTTP RPC Proxy', program.String, config.rpc.httpProxyMethods)
  .option('--rpc.http-proxy-cors [enable-cors]', 'Enable CORS for the HTTP RPC Proxy', program.BOOL, config.enableCors)
  .option('--rpc.user [rpc-user]', 'Broker rpc user name', program.String, config.rpc.user)
  .option('--rpc.pass [rpc-pass]', 'Broker rpc password', program.String, config.rpc.pass)
  .option('--rpc.pub-key-path [rpc-pub-key-path]', 'Location of the public key for the broker\'s rpc', validations.isFormattedPath, config.rpc.pubKeyPath)
  .option('--rpc.priv-key-path [rpc-priv-key-path]', 'Location of private key for the broker\'s rpc', validations.isFormattedPath, config.rpc.privKeyPath)
  .option('--rpc.self-signed-cert [rpc-cert-self-signed]', 'Whether the certificate used to secure the rpc connection is self-signed', program.BOOL, config.rpc.selfSignedCert)

// For each currency, we will add expected options for an engine
for (let currency of currencies) {
  let lowerSymbol = currency.symbol.toLowerCase()

  program
    .option(`--${lowerSymbol}.engine-type [engine-type]`, `The type of underlying Payment Channel Network node for ${currency.name}`, isSupportedEngineType, currency.engineType)
    .option(`--${lowerSymbol}.rpc-host [rpc-host]`, `Location of a Payment Channel Network node's RPC server to use for ${currency.name}.`, validations.isHost, currency.rpcHost)
    .option(`--${lowerSymbol}.tls-cert [tls-cert]`, `Location of the TLS certificate for the Payment Channel Network node to use when communicating with ${currency.name}.`, validations.isFormattedPath, currency.tlsCert)

  // LND Specific commands
  program
    .option(`--${lowerSymbol}.lnd-macaroon [lnd-macaroon]`, `Location of the LND macaroon to use when communicating with ${currency.name} LND. (Only for LND engine type)`, validations.isFormattedPath, currency.lndMacaroon)
}

program
  .action((args, opts) => {
    const {
      dataDir,
      network,
      interchainRouterAddress,
      idPubKeyPath: pubIdKeyPath,
      idPrivKeyPath: privIdKeyPath,
      markets,
      disableAuth,
      relayerRpcHost,
      relayerCertPath,
      rpcAddress,
      rpcProxyAddress: rpcInternalProxyAddress,
      rpcHttpProxyAddress,
      rpcHttpProxyMethods: proxyMethods,
      rpcHttpProxyCors: enableCors,
      rpcUser,
      rpcPass,
      rpcPubKeyPath: pubRpcKeyPath,
      rpcPrivKeyPath: privRpcKeyPath,
      rpcSelfSignedCert: isCertSelfSigned
    } = opts

    const engines = {}

    for (let currency of currencies) {
      let lowerSymbol = currency.symbol.toLowerCase()
      if (opts[`${lowerSymbol}EngineType`] === 'LND') {
        // TODO: Change the lndRpc, lndTls variables to generic names
        engines[currency.symbol] = {
          type: opts[`${lowerSymbol}EngineType`],
          lndRpc: opts[`${lowerSymbol}RpcHost`],
          lndTls: opts[`${lowerSymbol}TlsCert`],
          lndMacaroon: opts[`${lowerSymbol}LndMacaroon`]
        }
      } else {
        const engineType = opts[`${lowerSymbol}EngineType`]
        throw new Error(`Unsupported engine type: ${engineType}`)
      }
    }

    // `markets` will be a string of market symbols that are delimited by a comma
    const marketNames = (markets || '').split(',').filter(m => m)

    // proxyMethods will be a string of method names that are delimited by a comma
    const rpcHttpProxyMethods = (proxyMethods || '').split(',').filter(p => p)

    const brokerOptions = {
      network,
      pubRpcKeyPath,
      privRpcKeyPath,
      privIdKeyPath,
      pubIdKeyPath,
      rpcAddress,
      rpcInternalProxyAddress,
      rpcHttpProxyAddress,
      rpcHttpProxyMethods,
      interchainRouterAddress,
      dataDir,
      marketNames,
      engines,
      disableAuth,
      enableCors,
      isCertSelfSigned,
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
