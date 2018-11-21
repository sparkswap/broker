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

async function getIdentity (args, opts, logger) {
  const { rpcAddress = null } = opts

  try {
    const client = await new BrokerDaemonClient(rpcAddress)

    const { publicKey } = await client.adminService.getIdentity({})

    logger.info(publicKey)
  } catch (e) {
    logger.error(handleError(e))
  }
};

module.exports = (program) => {
  program
    .command('id', 'Gets the Public Key of the Broker Daemon')
    .option('--rpc-address', 'Location of the RPC server to use.', validations.isHost)
    .action(getIdentity)
}
