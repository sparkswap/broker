/**
 * Wallet
 * @module broker-cli/wallet
 */

const BrokerDaemonClient = require('./broker-daemon-client')
const { ENUMS, validations, askQuestion } = require('./utils')

/**
 * @constant
 * @type {Array<string>}
 * @default
 */
const ACCEPTED_ANSWERS = Object.freeze(['y', 'yes'])

/**
 * @constant
 * @type {Array<string>}
 * @default
 */
const SUPPORTED_SYMBOLS = Object.freeze(['BTC', 'LTC'])

/**
 * Supported commands for `kcli wallet`
 *
 * @constant
 * @type {Object<key, String>}
 * @default
 */
const SUPPORTED_COMMANDS = Object.freeze({
  BALANCE: 'balance',
  NEW_DEPOSIT_ADDRESS: 'new-deposit-address',
  COMMIT_BALANCE: 'commit-balance'
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
    const { balance } = await client.walletService.getBalance({})

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

/**
 * commit-balance
 *
 * ex: `kcli wallet commit-balance`
 *
 * @function
 * @param {Object} args
 * @param {Object} args.symbol
 * @param {Object} opts
 * @param {String} [opts.rpcAddress] broker rpc address
 * @param {Logger} logger
 * @return {Void}
 */
async function commitBalance (args, opts, logger) {
  const { symbol } = args
  const { rpcAddress = null } = opts

  try {
    const client = new BrokerDaemonClient(rpcAddress)
    const { balance } = await client.walletService.getBalance({})

    if (parseInt(balance) === 0) {
      return logger.info('Your current balance is 0, please add funds to your daemon (or check the status of your daemon)')
    }

    const maxSupportedBalance = Math.min(parseInt(balance), ENUMS.MAX_CHANNEL_BALANCE)

    logger.info(`For your knowledge, the Maximum supported balance at this time is: ${ENUMS.MAX_CHANNEL_BALANCE}`)
    logger.info(`Your current wallet balance is: ${balance}`)

    const answer = await askQuestion(`Are you OK committing ${maxSupportedBalance} in ${symbol}? (Y/N)`)

    if (!ACCEPTED_ANSWERS.includes(answer.toLowerCase())) return

    const res = await client.walletService.commitBalance({ balance: maxSupportedBalance, symbol })

    logger.info('Successfully added broker daemon to the kinesis exchange!', res)
  } catch (e) {
    throw e
  }
}

module.exports = (program) => {
  program
    .command('wallet', 'Commands to handle a wallet instance')
    .help('Available Commands: balance, new-deposit-address, commit-balance')
    .argument('<command>', '', Object.values(SUPPORTED_COMMANDS), null, true)
    .argument('[sub-arguments...]')
    .option('--rpc-address', 'Location of the RPC server to use.', validations.isHost)
    .action(async (args, opts, logger) => {
      const { command, subArguments } = args

      switch (command) {
        case SUPPORTED_COMMANDS.BALANCE:
          return balance(args, opts, logger)
        case SUPPORTED_COMMANDS.NEW_DEPOSIT_ADDRESS:
          return newDepositAddress(args, opts, logger)
        case SUPPORTED_COMMANDS.COMMIT_BALANCE:
          const [symbol] = subArguments

          if (!SUPPORTED_SYMBOLS.includes(symbol)) {
            throw new Error(`Provided symbol is not a valid currency for the exchange: ${symbol}`)
          }

          args.symbol = symbol

          return commitBalance(args, opts, logger)
      }
    })
    .command('wallet balance', 'Current daemon wallet balance')
    .command('wallet new-deposit-address', 'Generates a new wallet address for a daemon instance')
    .command('wallet commit-balance')
    .argument('<symbol>', `Supported currencies for the exchange: ${SUPPORTED_SYMBOLS.join('/')}`)
}
