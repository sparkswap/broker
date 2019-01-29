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
 * @param {String} args.publicKey
 * @param {Object} opts
 * @param {String} [rpcAddress=null] broker rpc address
 * @param {Logger} logger
 */

async function register (args, opts, logger) {
  const { publicKey } = args
  const { rpcAddress = null } = opts

  try {
    const client = await new BrokerDaemonClient(rpcAddress)

    const { entityId } = await client.adminService.register({publicKey})

    logger.info(entityId)
  } catch (e) {
    logger.error(handleError(e))
  }
};

module.exports = (program) => {
  program
    .command('register', 'Registers the public key with the authorization service')
    .argument('<publicKey>', 'Your public key.', validations.isPublicKey)
    .option('--rpc-address [rpc-address]', RPC_ADDRESS_HELP_STRING, validations.isHost)
    .action(register)
}
