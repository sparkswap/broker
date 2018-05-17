const BrokerDaemonClient = require('./broker-daemon-client')
const { validations } = require('./utils')

/**
 * kcli setup
 *
 * Tests the engine connection
 * See if a channel is open for the relayer
 * If not create one and prompt the user for action
 *
 * ex: `kcli setup`
 * ex: `kcli setup --rpc-address`
 *
 * @param {Object} args
 * @param {Object} opts
 * @param {Logger} logger
 */

async function setup (args, opts, logger) {
  const { rpcAddress = null } = opts

  try {
    const orderResult = await new BrokerDaemonClient(rpcAddress)
    logger.info(orderResult)
  } catch (e) {
    logger.error(e.toString())
  }
};

module.exports = (program) => {
  program
    .command('setup', 'Setup the daemon for the Kinesis Exchange')
    .option('--rpc-address', 'Location of the RPC server to use.', validations.isHost)
    .action(setup)
}
