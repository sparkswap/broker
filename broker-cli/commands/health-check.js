const LndEngine = require('lnd-engine')
require('colors')

const BrokerDaemonClient = require('../broker-daemon-client')
const { validations, handleError } = require('../utils')

/**
 * @constant
 * @type {Object<key, String>}
 * @default
 */
const STATUS_CODES = Object.freeze({
  OK: 'OK',
  UNKNOWN: 'UNKNOWN'
})

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
  const { rpcAddress } = opts

  try {
    const client = await new BrokerDaemonClient(rpcAddress)

    const {
      engineStatus = [],
      relayerStatus = STATUS_CODES.UNKNOWN
    } = await client.adminService.healthCheck({})

    if (!engineStatus.length) {
      logger.info(`No Engine Statuses Returned`.red)
    }

    engineStatus.forEach(({ symbol, status }) => {
      if (status === LndEngine.STATUSES.VALIDATED) {
        logger.info(`Engine status for ${symbol}: ` + `${STATUS_CODES.OK}`.green)
      } else {
        logger.info(`Engine status for ${symbol}: ` + `${status}`.red)
      }
    })

    if (relayerStatus === STATUS_CODES.OK) {
      logger.info('Relayer Status: ' + `${relayerStatus}`.green)
    } else {
      logger.info('Relayer Status: ' + `${relayerStatus}`.red)
    }

    logger.info('Daemon Status: ' + `${STATUS_CODES.OK}`.green)
  } catch (e) {
    logger.error(handleError(e))
  }
};

module.exports = (program) => {
  program
    .command('healthcheck', 'Checks the connection between Broker and the Exchange')
    .option('--rpc-address [rpc-address]', 'Location of the RPC server to use.', validations.isHost)
    .action(healthCheck)
}
