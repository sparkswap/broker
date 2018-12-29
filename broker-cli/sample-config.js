/**
 * SparkSwap CLI User configuration
 *
 * In order to edit this file, first move it to .sparkswap in your home directory
 * and rename it to 'config.js'
 *
 * On *nix in bash, you can do this by running:
 * `cp -n "$(dirname $(which sparkswap))/../lib/node_modules/broker-cli/sample-config.js" ~/.sparkswap/config.js`
 *
 */

module.exports = {
  /**
   * Address of the host for the Broker Daemon gRPC Server
   * @type {String}
   */
  rpcAddress: 'localhost:27492',

  /**
   * Default path of the Broker Daemons RPC Public Cert
   * @type {String}
   */
  rpcCertPath: '~/.sparkswap/certs/broker-rpc-tls.cert',

  /**
   * Configuration for SSL between the CLI and Daemon. This setting is only required
   * if you will be hosting the daemon remotely
   * @type {Boolean}
   */
  disableAuth: false,

  /**
   * The username specified on the remote Broker Daemon RPC
   * @type {String}
   */
  rpcUser: 'sparkswap',

  /**
   * The password specified on the remote Broker Daemon RPC
   * @type {String}
   */
  rpcPass: 'sparkswap'
}
