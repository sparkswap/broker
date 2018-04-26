const Broker = require('./broker')
const { validations } = require('./utils')

/**
 * kcli healthcheck
 *
 * Tests the broker and engine connection for the cli
 *
 * ex: `kcli healthcheck`
 *
 * @param {Object} args
 * @param {Object} opts
 * @param {String} [rpcAddress] broker rpc address
 * @param {Logger} logger
 */

async function healthCheck (args, opts, logger) {
  const { rpcAddress = null } = opts

  try {
    const res = await new Broker(rpcAddress).healthCheck()
    logger.info(`Engine Status: ${res.engineStatus}`)
  } catch (e) {
    logger.error(e.toString())
  }
};

module.exports = (program) => {
  program
    .command('healthcheck', 'Checks the connection between Broker and the Exchange')
    .option('--rpc-address', 'Location of the RPC server to use.', validations.isRPCHost)
    .action(healthCheck)
}
