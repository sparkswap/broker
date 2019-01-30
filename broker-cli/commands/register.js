const BrokerDaemonClient = require('../broker-daemon-client')
const { validations, handleError } = require('../utils')
const { RPC_ADDRESS_HELP_STRING } = require('../utils/strings')

/**
 *
 * Register publicKey with the Relayer's authorization service
 *
 * ex: `sparkswap register`
 *
 * @param {Object} args
 * @param {Object} opts
 * @param {String} [rpcAddress=null] broker rpc address
 * @param {Logger} logger
 */

async function register (args, opts, logger) {
  const { rpcAddress = null } = opts

  try {
    const client = await new BrokerDaemonClient(rpcAddress)

    // Currently we don't do anything with this entityId but we will need it in the future
    const { entityId } = await client.adminService.register({})

    logger.info('Successfully registered', { entityId })
  } catch (e) {
    logger.error(handleError(e))
  }
};

module.exports = (program) => {
  program
    .command('register', 'Registers the public key with the authorization service')
    .option('--rpc-address [rpc-address]', RPC_ADDRESS_HELP_STRING, validations.isHost)
    .action(register)
}
