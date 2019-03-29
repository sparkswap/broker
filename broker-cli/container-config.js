/**
 * Sparkswap configuration for using the cli inside the container. (Note the rpcCertPath is relative to being inside the container)
 *
 * It will use the user defined rpc username and password if they exist, otherwise
 * they will use the default.
 */

module.exports = {
  /**
   * Address of the host for the Broker Daemon gRPC Server
   * Because we are inside the container, the address will be localhost and the port is hardcoded to 27492
   * @type {String}
   */
  rpcAddress: 'localhost:27492',

  /**
   * Default path of the Broker Daemons RPC Public Cert
   * The cert will always be at this path because that is where it is mounted in the container.
   * @type {String}
   */
  rpcCertPath: '/secure/broker-rpc-tls.cert',

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
