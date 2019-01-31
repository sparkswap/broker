const BrokerDaemonClient = require('../broker-daemon-client')
const { validations, handleError } = require('../utils')
const { RPC_ADDRESS_HELP_STRING, JSON_FORMAT_STRING } = require('../utils/strings')

/**
 *
 * Register publicKey with the Relayer
 *
 * ex: `sparkswap register`
 *
 * @param {Object} args
 * @param {Object} opts
 * @param {String} [rpcAddress=null] broker rpc address
 * @param {Logger} logger
 */

async function register (args, opts, logger) {
  const { rpcAddress = null, json } = opts

  try {
    const client = await new BrokerDaemonClient(rpcAddress)
    const registerResult = await client.adminService.register({})
    if (json) {
      logger.info(registerResult)
    } else {
      logger.info('Successfully registered public key with relayer')
    }
  } catch (e) {
    logger.error(handleError(e))
  }
};

module.exports = (program) => {
  program
    .command('register', 'Registers the public key with the relayer')
    .option('--rpc-address [rpc-address]', RPC_ADDRESS_HELP_STRING, validations.isHost)
    .option('--json', JSON_FORMAT_STRING, program.BOOLEAN)
    .action(register)
}
