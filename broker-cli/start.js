/**
 * Start
 * @module broker-cli/start
 */

const BrokerDaemonClient = require('./broker-daemon-client')
const { validations } = require('./utils')

/**
 * new-deposit-address
 *
 * ex: `kcli wallet new-deposit-address`
 *
 * @function
 * @param {Object} args
 * @param {Object} opts
 * @param {String} [opts.rpcAddress] broker rpc address
 * @param {Logger} logger
 * @return {Void}
 */
async function start (args, opts, logger) {
  const {
    fundingAmount = null,
    rpcAddress = null
  } = opts

  try {
    console.log('here')
    await new BrokerDaemonClient(rpcAddress).openChannel(fundingAmount)
  } catch (e) {
    logger.error(e)
  }
}

module.exports = (program) => {
  program
    .command('start', 'Connects the daemon to the relayer to begin trading')
    .option('--funding-amount', 'Funding amount of the channel. Will default to the full wallet balance', validations.isPrice)
    .option('--rpc-address', 'Location of the RPC server to use.', validations.isHost)
    .action(start)
}
