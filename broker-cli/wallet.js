/**
 * Wallet
 * @module broker-cli/wallet
 */

const BrokerDaemonClient = require('./broker-daemon-client')
const { ENUMS, validations, askQuestion } = require('./utils')
const {
  config: { symbol: DEFAULT_TICKER_SYMBOL }
} = require('../package.json')

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
    const {
      totalBalance,
      totalUncommittedBalance,
      totalCommittedBalance,
      committedBalances = []
    } = await client.walletService.getBalances({})

    logger.info(`Total Balance (${DEFAULT_TICKER_SYMBOL}): ${totalBalance}`)
    logger.info(`Total Uncommitted Balance (${DEFAULT_TICKER_SYMBOL}): ${totalUncommittedBalance}`)
    logger.info(`Total Committed Balance (${DEFAULT_TICKER_SYMBOL}: ${totalCommittedBalance}`)

    committedBalances.forEach(({ symbol, value }) => {
      logger.info(`${symbol} Balance: ${value}`)
    })
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

  if (DEFAULT_TICKER_SYMBOL !== symbol) {
    return logger.info('Please switch the daemon to another supported currency.')
  }

  try {
    const client = new BrokerDaemonClient(rpcAddress)

    const {
      totalBalance,
      totalUncommittedBalance
    } = await client.walletService.getBalances({})

    if (parseInt(balance) === 0) {
      return logger.info('Your current balance is 0, please add funds to your daemon (or check the status of your daemon)')
    }

    // TODO: BIG this var instead of using `parseInt`
    const maxSupportedBalance = Math.min(parseInt(totalUncommittedBalance), ENUMS.MAX_CHANNEL_BALANCE)

    logger.info(`For your knowledge, the Maximum supported balance at this time is: ${ENUMS.MAX_CHANNEL_BALANCE}`)
    logger.info(`Your current wallet balance is: ${totalBalance}`)
    logger.info(`Your current uncommitted wallet balance is: ${totalUncommittedBalance}`)

    const answer = await askQuestion(`Are you OK committing ${maxSupportedBalance} of your uncommitted balance in ${symbol}? (Y/N)`)

    if (!ACCEPTED_ANSWERS.includes(answer.toLowerCase())) return

    const res = await client.walletService.commitBalance({ balance: maxSupportedBalance, symbol })

    logger.info('Successfully added broker daemon to the kinesis exchange!', res)
  } catch (e) {
    logger.error(e)
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

          if (!Object.values(SUPPORTED_SYMBOLS).includes(symbol)) {
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
