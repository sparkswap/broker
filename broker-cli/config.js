const BrokerDaemonClient = require('./broker-daemon-client')
const { validations } = require('./utils')

/**
 * Returns configuration information for a particular broker
 *
 * @param {Object} args
 * @param {String} [args.rpcAddress=null]
 * @param {Object} opts
 * @param {Logger} logger
 */
async function config (args, opts, logger) {
  const { rpcAddress = null } = opts

  try {
    const client = new BrokerDaemonClient(rpcAddress)
    const res = await client.adminService.getInfo({})

    logger.info('Current Kinesis Configuration:')

    if (res) {
      Object.keys(res).forEach(key => logger.info(`${key}: ${res[key]}`))
    }
  } catch (e) {
    logger.error(e)
  }
}

module.exports = (program) => {
  program
    .command('config', 'All current configuration settings')
    .option('--rpc-address', 'Location of the RPC server to use.', validations.isHost)
    .action(config)
}
