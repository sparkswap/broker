/**
 * Wallet
 * @module broker-cli/wallet
 */

const Table = require('cli-table')
require('colors')
const BrokerDaemonClient = require('../broker-daemon-client')
const { ENUMS, validations, askQuestion, Big } = require('../utils')
const { currencies: currencyConfig } = require('../configuration')

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
 * Supported commands for `sparkswap wallet`
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
    const { balances } = await client.walletService.getBalances({})

    const balancesTable = new Table({
      head: ['', 'Committed', 'Uncommitted'],
      colWidths: [10, 22, 22],
      style: { head: ['gray'] }
    })

    balances.forEach(({ symbol, uncommittedBalance, totalChannelBalance }) => {
      const divideBy = currencyConfig.find(({ symbol: configSymbol }) => configSymbol === symbol).quantumsPerCommon

      balancesTable.push(
        [
          symbol,
          Big(totalChannelBalance).div(divideBy).toFixed(16).green,
          Big(uncommittedBalance).div(divideBy).toFixed(16)
        ]
      )
    })

    logger.info('Wallet Balances'.bold.white)
    logger.info(balancesTable.toString())
  } catch (e) {
    logger.error(e)
  }
}

/**
 * new-deposit-address
 *
 * ex: `sparkswap wallet new-deposit-address`
 *
 * @function
 * @param {Object} args
 * @param {Object} opts
 * @param {String} [opts.rpcAddress] broker rpc address
 * @param {Logger} logger
 * @return {Void}
 */
async function newDepositAddress (args, opts, logger) {
  const { symbol } = args
  const { rpcAddress = null } = opts

  try {
    const client = new BrokerDaemonClient(rpcAddress)
    const { address } = await client.walletService.newDepositAddress({ symbol })

    logger.info(address)
  } catch (e) {
    logger.error(e)
  }
}

/**
 * commit-balance
 *
 * ex: `sparkswap wallet commit-balance`
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

    const { balances } = await client.walletService.getBalances({})

    const { uncommittedBalance } = balances.find(({ symbol: s }) => s === symbol)

    const totalUncommittedBalance = Big(uncommittedBalance)
    if (totalUncommittedBalance.eq(0)) {
      return logger.info('Your current uncommitted balance is 0, please add funds to your daemon')
    }
    // We try to take the `Math.min` total here between 2 Big numbers due to a
    // commit limit specified as MAX_CHANNEL_BALANCE
    let maxSupportedBalance = uncommittedBalance

    if (totalUncommittedBalance.gt(ENUMS.MAX_CHANNEL_BALANCE)) {
      maxSupportedBalance = ENUMS.MAX_CHANNEL_BALANCE
    }

    const divideBy = currencyConfig.find(({ symbol: configSymbol }) => configSymbol === symbol).quantumsPerCommon

    logger.info(`For your knowledge, the Maximum supported balance at this time is: ${Big(ENUMS.MAX_CHANNEL_BALANCE).div(divideBy)} ${symbol}`)
    logger.info(`Your current uncommitted wallet balance is: ${Big(uncommittedBalance).div(divideBy)} ${symbol}`)

    const answer = await askQuestion(`Are you OK committing ${Big(maxSupportedBalance).div(divideBy)} ${symbol} to SparkSwap? (Y/N)`)

    if (!ACCEPTED_ANSWERS.includes(answer.toLowerCase())) return

    await client.walletService.commitBalance({ balance: maxSupportedBalance.toString(), symbol })

    logger.info('Successfully committed balance to SparkSwap Relayer!')
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

      // TODO: Figure out a way to handle subArguments that could be dynamic
      // for each command
      let [symbol = ''] = subArguments

      switch (command) {
        case SUPPORTED_COMMANDS.BALANCE:
          return balance(args, opts, logger)
        case SUPPORTED_COMMANDS.NEW_DEPOSIT_ADDRESS:
          symbol = symbol.toUpperCase()

          if (!Object.values(SUPPORTED_SYMBOLS).includes(symbol)) {
            throw new Error(`Provided symbol is not a valid currency for new deposit address creation`)
          }

          args.symbol = symbol

          return newDepositAddress(args, opts, logger)
        case SUPPORTED_COMMANDS.COMMIT_BALANCE:
          symbol = symbol.toUpperCase()

          if (!Object.values(SUPPORTED_SYMBOLS).includes(symbol)) {
            throw new Error(`Provided symbol is not a valid currency for the exchange`)
          }

          args.symbol = symbol

          return commitBalance(args, opts, logger)
      }
    })
    .command('wallet balance', 'Current daemon wallet balance')
    .command('wallet new-deposit-address', 'Generates a new wallet address for a daemon instance')
    .argument('<symbol>', `Supported currencies for the exchange: ${SUPPORTED_SYMBOLS.join('/')}`)
    .command('wallet commit-balance')
    .argument('<symbol>', `Supported currencies for the exchange: ${SUPPORTED_SYMBOLS.join('/')}`)
}
