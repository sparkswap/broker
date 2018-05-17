const BrokerDaemonClient = require('./broker-daemon-client')
const { validations } = require('./utils')

/**
 * kcli deposit
 *
 * Tests the broker and engine connection for the cli
 *
 * ex: `kcli deposit`
 *
 * @function
 * @param {Object} args
 * @param {Object} opts
 * @param {String} [rpcAddress] broker rpc address
 * @param {Logger} logger
 */
async function deposit (args, opts, logger) {
  const { rpcAddress = null } = opts

  try {
    const { address } = await new BrokerDaemonClient(rpcAddress).newWalletAddress()
    logger.info(address)
  } catch (e) {
    logger.error(e.toString())
  }
};

module.exports = (program) => {
  program
    .command('deposit', 'Generates a new wallet address for a configured daemon wallet that can be used to make a deposit')
    .option('--rpc-address', 'Location of the RPC server to use.', validations.isHost)
    .action(deposit)
}
