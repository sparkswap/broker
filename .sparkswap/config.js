/**
 * Sparkswap configuration for use inside the container. (Note the rpcCertPath is relative to being inside the container)
 *
 * It will use the user defined rpc address, user and password if they exist, otherwise
 * they will use the default.
 */

module.exports = {
  /**
   * Address of the host for the Broker Daemon gRPC Server
   * @type {String}
   */
  rpcAddress: process.env.RPC_ADDRESS || 'localhost:27492',

  /**
   * Default path of the Broker Daemons RPC Public Cert
   * @type {String}
   */
  rpcCertPath: '/secure/broker-rpc-tls.cert',

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
  rpcUser: process.env.RPC_USER || 'sparkswap',

  /**
   * The password specified on the remote Broker Daemon RPC
   * @type {String}
   */
  rpcPass: process.env.RPC_PASS || 'sparkswap'
}
