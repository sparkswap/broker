/**
 * SparkSwap CLI User configuration
 *
 * In order to edit this file, first move it to your home directory
 * and rename it to '.sparkswap.js'
 *
 * On *nix in bash, you can do this by running:
 * `cp -n "$(dirname $(which sparkswap))/../lib/node_modules/broker-cli/sample-.sparkswap.js" ~/.sparkswap.js`
 *
 */

module.exports = {
  /**
   * Address of the host for the Broker Daemon gRPC Server
   * @type {String}
   */
  // rpcAddress: 'localhost:27492',

  /**
   * Default path of the Broker Daemons RPC Public Cert
   * @type {String}
   */
  // rpcCert: 'certs/broker-rpc-tls.cert',

  /**
   * Configuration for SSL between the CLI and Daemon
   * @type {Boolean}
   */
  // disableSsl: false
}
