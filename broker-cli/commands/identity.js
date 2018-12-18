const BrokerDaemonClient = require('../broker-daemon-client')
const { validations, handleError } = require('../utils')
const { RPC_ADDRESS_HELP_STRING } = require('../utils/strings')

/**
 * sparkswap id
 *
 * Get the BrokerDaemon's Identity
 *
 * ex: `sparkswap id`
 *
 * @param {Object} args
 * @param {Object} opts
 * @param {String} [rpcAddress=null] broker rpc address
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
    .option('--rpc-address [rpc-address]', RPC_ADDRESS_HELP_STRING, validations.isHost)
    .action(getIdentity)
}
