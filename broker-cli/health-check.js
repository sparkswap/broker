const Broker = require('./broker')
const { ENUMS, validations } = require('./utils')
const { STATUS_CODES } = ENUMS

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
    const { engineStatus, relayerStatus } = await new Broker(rpcAddress).healthCheck()
    const res = {
      engineStatus,
      relayerStatus,
      daemonStatus: STATUS_CODES.OK
    }
    logger.info(`HealthCheck: ${JSON.stringify(res)}`)
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
