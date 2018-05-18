/**
 * Wallet
 * @module broker-cli/wallet
 */

const BrokerDaemonClient = require('./broker-daemon-client')
const { validations } = require('./utils')

/**
 * Supported commands for `kcli wallet`
 *
 * @constant
 * @type {Object<key, String>}
 * @default
 */
const SUPPORTED_COMMANDS = Object.freeze({
  BALANCE: 'balance'
})

/**
 * Calls the broker for the daemons wallet balance
 *
 * @see SUPPORTED_COMMANDS
 * @function
 * @param {String} [rpcAddress] broker rpc address
 * @return {Promise}
 */
async function walletBalance (rpcAddress) {
  return new BrokerDaemonClient(rpcAddress).walletBalance()
}

/**
 * kcli wallet
 *
 * ex: `kcli wallet`
 *
 * @see SUPPORTED_COMMANDS
 * @function
 * @param {Object} args
 * @param {String} args.command
 * @param {Object} opts
 * @param {String} [opts.rpcAddress] broker rpc address
 * @param {Logger} logger
 */
async function wallet (args, opts, logger) {
  const { command } = args
  const { rpcAddress = null } = opts

  try {
    switch (command) {
      case SUPPORTED_COMMANDS.BALANCE:
        const { balance } = await walletBalance(rpcAddress)
        logger.info(`Total Balance: ${balance}`)
        break
      default:
        throw new Error('Command not found')
    }
  } catch (e) {
    logger.error(e.toString())
  }
};

module.exports = (program) => {
  program
    .command('wallet', 'Checks the connection between Broker and the Exchange')
    .argument('<command>', 'Wallet commands (balance)', Object.values(SUPPORTED_COMMANDS))
    .option('--rpc-address', 'Location of the RPC server to use.', validations.isHost)
    .action(wallet)
}
