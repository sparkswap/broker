/**
 * init
 * @module broker-cli/init
 */

const BrokerDaemonClient = require('./broker-daemon-client')
const { validations } = require('./utils')

/**
 * init
 *
 * ex: `kcli init`
 *
 * @function
 * @param {Object} args
 * @param {Object} opts
 * @param {String} [opts.rpcAddress] broker rpc address
 * @param {Logger} logger
 * @return {Void}
 */
async function init (args, opts, logger) {
  const {
    relayerAddress = null,
    rpcAddress = null
  } = opts

  try {
    const res = await new BrokerDaemonClient(rpcAddress).setup(relayerAddress)
    logger.info('Successfully added broker daemon to the kinesis exchange!', res)
  } catch (e) {
    logger.error(e)
  }
}

module.exports = (program) => {
  program
    .command('init', 'Starts the setup process of a Kinesis Broker Daemon')
    .option('--relayer-address', 'Relayers host address', validations.isHost)
    .option('--rpc-address', 'Location of the RPC server to use.', validations.isHost)
    .action(init)
}
