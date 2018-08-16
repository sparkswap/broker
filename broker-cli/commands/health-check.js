const BrokerDaemonClient = require('../broker-daemon-client')
const { ENUMS, validations, handleError } = require('../utils')
const { STATUS_CODES } = ENUMS

/**
 * sparkswap healthcheck
 *
 * Tests the broker and engine connection for the cli
 *
 * ex: `sparkswap healthcheck`
 *
 * @param {Object} args
 * @param {Object} opts
 * @param {String} [rpcAddress] broker rpc address
 * @param {Logger} logger
 */

async function healthCheck (args, opts, logger) {
  const { rpcAddress = null } = opts

  try {
    const client = await new BrokerDaemonClient(rpcAddress)

    const { engineStatus, relayerStatus } = await client.adminService.healthCheck({})

    // TODO: If `engineStatus` or `relayerStatus` is undefined, then we will not see
    // a status
    const res = {
      engines: engineStatus.reduce((acc, { symbol, status }) => {
        acc[symbol] = status
        return acc
      }, {}),
      relayerStatus,
      daemonStatus: STATUS_CODES.OK
    }

    logger.info(`HealthCheck: ${JSON.stringify(res, null, '  ')}`)
  } catch (e) {
    if (e.message === '14 UNAVAILABLE: Connect Failed') {
      logger.error(handleError(e))
    }
    if (e.details) {
      logger.error(e.details)
    } else {
      logger.error(e)
    }
  }
};

module.exports = (program) => {
  program
    .command('healthcheck', 'Checks the connection between Broker and the Exchange')
    .option('--rpc-address', 'Location of the RPC server to use.', validations.isHost)
    .action(healthCheck)
}
