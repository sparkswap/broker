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
  BALANCE: 'balance',
  NEW_DEPOSIT_ADDRESS: 'new-deposit-address'
})

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
async function balance (args, opts, logger) {
  const { rpcAddress = null } = opts

  try {
    const client = new BrokerDaemonClient(rpcAddress)
    const { balance } = await client.walletService.walletBalance({})

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
    const client = new BrokerDaemonClient(rpcAddress)
    const { address } = await client.walletService.newDepositAddress({})

    logger.info(address)
  } catch (e) {
    logger.error(e)
  }
}

module.exports = (program) => {
  program
    .command('wallet', 'Commands to handle a wallet instance')
    .help('Available Commands: balance, new-deposit-address')
    .argument('<command>', '', Object.values(SUPPORTED_COMMANDS), null, true)
    .action(async (args, opts, logger) => {
      const { command } = args

      if (command === SUPPORTED_COMMANDS.BALANCE) return balance(args, opts, logger)
      if (command === SUPPORTED_COMMANDS.NEW_DEPOSIT_ADDRESS) return newDepositAddress(args, opts, logger)
    })
    .command('wallet balance', 'Current daemon wallet balance')
    .option('--rpc-address', 'Location of the RPC server to use.', validations.isHost)
    .command('wallet new-deposit-address', 'Generates a new wallet address for a daemon instance')
    .option('--rpc-address', 'Location of the RPC server to use.', validations.isHost)
}
