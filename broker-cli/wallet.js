/**
 * Wallet
 * @module broker-cli/wallet
 */

const BrokerDaemonClient = require('./broker-daemon-client')
const { validations } = require('./utils')

/**
 * Calls the broker for the daemons wallet balance
 *
 * @see SUPPORTED_COMMANDS
 * @function
 * @param {Object} args
 * @param {Object} opts
 * @param {String} [opts.rpcAddress] broker rpc address
 * @param {Logger} logger
 * @return {Void}
 */
async function walletBalance (args, opts, logger) {
  const { rpcAddress = null } = opts

  try {
    const { balance } = await new BrokerDaemonClient(rpcAddress).walletBalance()
    logger.info(`Total Balance: ${balance}`)
  } catch (e) {
    logger.error(e)
  }
}

/**
 * new-deposit-address
 *
 * ex: `kcli wallet new-deposit-address`
 *
 * @function
 * @param {Object} args
 * @param {Object} opts
 * @param {String} [opts.rpcAddress] broker rpc address
 * @param {Logger} logger
 * @return {Void}
 */
async function newDepositAddress (args, opts, logger) {
  const { rpcAddress = null } = opts

  try {
    const { address } = await new BrokerDaemonClient(rpcAddress).newDepositAddress()
    logger.info(address)
  } catch (e) {
    logger.error(e)
  }
}

module.exports = (program) => {
  program
    .command('wallet', 'Commands to handle a wallet instance')
    .help('Available Commands: balance, new-deposit-address')
    .command('wallet balance', 'Current daemon wallet balance')
    .option('--rpc-address', 'Location of the RPC server to use.', validations.isHost)
    .action(walletBalance)
    .command('wallet new-deposit-address', 'Generates a new wallet address for a daemon instance')
    .option('--rpc-address', 'Location of the RPC server to use.', validations.isHost)
    .action(newDepositAddress)
}
