/**
 * Wallet
 * @module broker-cli/wallet
 */

const Table = require('cli-table')
require('colors')

const BrokerDaemonClient = require('../broker-daemon-client')
const { validations, askQuestion, Big, handleError } = require('../utils')
const { currencies: currencyConfig } = require('../config')

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
const SUPPORTED_SYMBOLS = Object.freeze(
  Object.values(currencyConfig).map(currency => currency.symbol)
)

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
  COMMIT: 'commit',
  NETWORK_ADDRESS: 'network-address',
  NETWORK_STATUS: 'network-status',
  RELEASE: 'release',
  WITHDRAW: 'withdraw',
  CREATE: 'create',
  UNLOCK: 'unlock'
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
  const { rpcAddress } = opts

  try {
    const client = new BrokerDaemonClient(rpcAddress)
    const { balances } = await client.walletService.getBalances({})

    const balancesTable = new Table({
      head: ['', 'Committed (Pending)', 'Uncommitted (Pending)'],
      style: { head: ['gray'] }
    })

    balances.forEach(({ symbol, uncommittedBalance, totalChannelBalance, totalPendingChannelBalance, uncommittedPendingBalance }) => {
      balancesTable.push([
        symbol,
        // We fix all pending balances to 8 decimal places due to aesthetics. Since
        // this balance should only be temporary, we do not care as much about precision
        `${totalChannelBalance.green}` + ` (${Big(totalPendingChannelBalance).toFixed(8)})`.grey,
        uncommittedBalance + ` (${Big(uncommittedPendingBalance).toFixed(8)})`.grey
      ])
    })

    logger.info('Wallet Balances'.bold.white)
    logger.info(balancesTable.toString())
  } catch (e) {
    logger.error(handleError(e))
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
  const { rpcAddress } = opts

  try {
    const client = new BrokerDaemonClient(rpcAddress)
    const { address } = await client.walletService.newDepositAddress({ symbol })

    logger.info(address)
  } catch (e) {
    logger.error(handleError(e))
  }
}

/**
 * commit
 *
 * ex: `sparkswap wallet commit`
 *
 * @function
 * @param {Object} args
 * @param {Object} args.symbol
 * @param {Object} opts
 * @param {String} [opts.rpcAddress] broker rpc address
 * @param {String} [opts.market] market to commit funds to
 * @param {Logger} logger
 * @return {Void}
 */
async function commit (args, opts, logger) {
  const { symbol, amount } = args
  const { rpcAddress, market } = opts
  const currentCurrencyConfig = currencyConfig.find(({ symbol: configSymbol }) => configSymbol === symbol)

  try {
    if (!currentCurrencyConfig) {
      throw new Error(`Currency is not supported by the CLI: ${symbol}`)
    }

    const client = new BrokerDaemonClient(rpcAddress)

    const { balances } = await client.walletService.getBalances({})

    const { uncommittedBalance } = balances.find(({ symbol: s }) => s === symbol)

    const totalUncommittedBalance = Big(uncommittedBalance)

    if (totalUncommittedBalance.eq(0)) {
      return logger.info('Your current uncommitted balance is 0, please add funds to your daemon')
    }

    // We try to take the lowest total here between 2 Big numbers due to a
    // commit limit specified as `maxChannelBalance` in the currency configuration
    let maxSupportedBalance = totalUncommittedBalance

    const maxChannelBalance = Big(currentCurrencyConfig.maxChannelBalance)

    if (totalUncommittedBalance.gt(maxChannelBalance)) {
      maxSupportedBalance = maxChannelBalance
    }

    // The logic here only runs if an amount is specified in the commit command
    if (amount) {
      const specifiedAmount = Big(amount)

      if (specifiedAmount.lt(maxChannelBalance)) {
        maxSupportedBalance = specifiedAmount
      }
    }

    logger.info(`For your knowledge, the Maximum supported balance at this time is: ${maxSupportedBalance.toString()} ${symbol}`)
    logger.info(`Your current uncommitted wallet balance is: ${uncommittedBalance.toString()} ${symbol}`)

    const answer = await askQuestion(`Are you OK committing ${maxSupportedBalance.toString()} ${symbol} to sparkswap? (Y/N)`)

    if (!ACCEPTED_ANSWERS.includes(answer.toLowerCase())) return

    if (maxSupportedBalance.gt(uncommittedBalance)) {
      throw new Error(`Amount specified is larger than your current uncommitted balance of ${uncommittedBalance} ${symbol}`)
    }

    await client.walletService.commit({ balance: maxSupportedBalance.toString(), symbol, market })

    logger.info('Successfully committed balance to sparkswap Relayer!')
  } catch (e) {
    logger.error(handleError(e))
  }
}

/**
 * network-address
 *
 * ex: `sparkswap wallet network-address BTC`
 *
 * @function
 * @param {Object} args
 * @param {Object} args.symbol
 * @param {Object} opts
 * @param {String} [opts.rpcAddress] broker rpc address
 * @param {Logger} logger
 * @return {Void}
 */
async function networkAddress (args, opts, logger) {
  const { symbol } = args
  const { rpcAddress } = opts

  try {
    const client = new BrokerDaemonClient(rpcAddress)

    const { paymentChannelNetworkAddress } = await client.walletService.getPaymentChannelNetworkAddress({ symbol })

    logger.info(paymentChannelNetworkAddress)
  } catch (e) {
    logger.error(handleError(e))
  }
}

/**
 * network-status
 *
 * ex: `sparkswap wallet network-status`
 *
 * @function
 * @param {Object} args
 * @param {Object} opts
 * @param {String} [opts.rpcAddress] broker rpc address
 * @param {String} [opts.market] market name
 * @param {Logger} logger
 * @return {Void}
 */
async function networkStatus (args, opts, logger) {
  const { market, rpcAddress } = opts

  try {
    const client = new BrokerDaemonClient(rpcAddress)
    const { baseSymbolCapacities, counterSymbolCapacities } = await client.walletService.getTradingCapacities({market})

    const statusTable = new Table({
      head: ['', `${baseSymbolCapacities.symbol.toUpperCase()} Capacity`, `${counterSymbolCapacities.symbol.toUpperCase()} Capacity`],
      colWidths: [14, 24, 24],
      style: { head: ['gray'] }
    })

    statusTable.push(['Active', '', ''])
    statusTable.push([`  Buy ${baseSymbolCapacities.symbol.toUpperCase()}`, formatBalance(baseSymbolCapacities.activeReceiveCapacity, 'active'), formatBalance(counterSymbolCapacities.activeSendCapacity, 'active')])
    statusTable.push([`  Sell ${baseSymbolCapacities.symbol.toUpperCase()}`, formatBalance(baseSymbolCapacities.activeSendCapacity, 'active'), formatBalance(counterSymbolCapacities.activeReceiveCapacity, 'active')])

    statusTable.push(['Pending', '', ''])
    statusTable.push([`  Buy ${baseSymbolCapacities.symbol.toUpperCase()}`, formatBalance(baseSymbolCapacities.pendingReceiveCapacity, 'pending'), formatBalance(counterSymbolCapacities.pendingSendCapacity, 'pending')])
    statusTable.push([`  Sell ${baseSymbolCapacities.symbol.toUpperCase()}`, formatBalance(baseSymbolCapacities.pendingSendCapacity, 'pending'), formatBalance(counterSymbolCapacities.pendingReceiveCapacity, 'pending')])

    statusTable.push(['Inactive', '', ''])
    statusTable.push([`  Buy ${baseSymbolCapacities.symbol.toUpperCase()}`, formatBalance(baseSymbolCapacities.inactiveReceiveCapacity, 'inactive'), formatBalance(counterSymbolCapacities.inactiveSendCapacity, 'inactive')])
    statusTable.push([`  Sell ${baseSymbolCapacities.symbol.toUpperCase()}`, formatBalance(baseSymbolCapacities.inactiveSendCapacity, 'inactive'), formatBalance(counterSymbolCapacities.inactiveReceiveCapacity, 'inactive')])

    logger.info(` ${market.bold.white}`)
    logger.info(statusTable.toString())
  } catch (e) {
    logger.error(handleError(e))
  }
}

/**
 * Formats the capacities to fixed numbers and colors them if they are greater
 * than 0
 *
 * @function
 * @param {string} balance
 * @param {string} status
 * @return {string} balance formatted with size and color
 */
function formatBalance (balance, status) {
  const fixedBalance = Big(balance).toFixed(16)
  if (Big(balance).gt(0)) {
    switch (status) {
      case 'active':
        return fixedBalance.green
      case 'pending':
        return fixedBalance.yellow
      case 'inactive':
        return fixedBalance.red
      default:
        return fixedBalance
    }
  }

  return fixedBalance
}

/**
 * release
 *
 * ex: `sparkswap wallet release`
 *
 * @function
 * @param {Object} args
 * @param {Object} args.symbol
 * @param {Object} opts
 * @param {String} [opts.rpcAddress] broker rpc address
 * @param {String} [opts.market] market name, i.e BTC/LTC
 * @param {Logger} logger
 * @return {Void}
 */
async function release (args, opts, logger) {
  const { market } = args
  const { rpcAddress, force } = opts

  try {
    const client = new BrokerDaemonClient(rpcAddress)

    let question
    if (force) {
      question = `Are you sure you want to FORCE the release of all channels you have open on the ${market} market? (Y/N)`
    } else {
      question = `Are you sure you want to release all channels you have open on the ${market} market? (Y/N)`
    }

    const answer = await askQuestion(question)

    if (!ACCEPTED_ANSWERS.includes(answer.toLowerCase())) return

    try {
      // We want to keep track if any returned channel had an error while attempting
      // to be released so that we can display the proper error warnings below
      let channelHasError = false

      const { channels = [] } = await client.walletService.releaseChannels({ market, force })

      if (!channels) {
        throw new Error('No information was retrieved from the daemon')
      }

      logger.info(`Released Market: ${market}`)

      channels.forEach((channel) => {
        const { symbol, error, status } = channel

        if (error) {
          channelHasError = true
          logger.info(`${symbol}: ` + `${status}: ${error}`.red)
        } else {
          logger.info(`${symbol}: ` + status.green)
        }
      })

      if (channelHasError) {
        logger.info(`\nErrors have occurred while trying to release channels for ${market}:`.red)
      }

      if (channelHasError && !force) {
        logger.info('If the error above suggests an uncooperative closing of any channels on')
        logger.info('your daemon, you can force the release of funds using the `--force` option.')
        logger.info('')
        logger.info('However, it is important to note that using `--force` has the potential to')
        logger.info('lock your funds for an extended period of time and cost additional fees')
      }
    } catch (e) {
      logger.error(`Failed to release payment channels for ${market}`.red)
      throw e
    }
  } catch (e) {
    logger.error(handleError(e))
  }
}

/**
 * withdraw
 *
 * ex: `sparkswap wallet withdraw`
 *
 * @function
 * @param {Object} args
 * @param {String} args.symbol
 * @param {String} args.address
 * @param {String} args.amount
 * @param {Object} opts
 * @param {String} [opts.rpcAddress] broker rpc address
 * @param {String} [opts.walletAddress] wallet address to move funds to
 * @param {Logger} logger
 * @return {Void}
 */
async function withdraw (args, opts, logger) {
  const {symbol, address, amount} = args
  const { rpcAddress } = opts

  try {
    const client = new BrokerDaemonClient(rpcAddress)

    const answer = await askQuestion(`Are you sure you want to withdraw ${amount} ${symbol} from your wallet? (Y/N)`)

    if (!ACCEPTED_ANSWERS.includes(answer.toLowerCase())) return

    const { txid } = await client.walletService.withdrawFunds({ symbol, address, amount })
    logger.info(`Successfully withdrew ${amount} ${symbol} from your wallet!`, { id: txid })
  } catch (e) {
    logger.error(handleError(e))
  }
}

/**
 * Create a wallet
 *
 * ex: `sparkswap wallet create`
 *
 * @function
 * @param {Object} args
 * @param {String} args.symbol
 * @param {Object} opts
 * @param {Logger} logger
 * @return {Void}
 */
async function create (args, opts, logger) {
  const { symbol } = args
  const { rpcAddress = null } = opts

  try {
    const client = new BrokerDaemonClient(rpcAddress)

    const password = await askQuestion(`Please enter a password:`, { silent: true })
    const confirmPass = await askQuestion(`Please confirm password:`, { silent: true })

    if (password !== confirmPass) {
      return logger.error('Error: Passwords did not match, please try again'.red)
    }

    const { recoverySeed } = await client.walletService.createWallet({ symbol, password })

    logger.info('IMPORTANT: Please make a copy of the recovery seed below as you WILL NOT')
    logger.info('be able to recover this information again. We recommend that you write')
    logger.info('down all the secret words, and re-confirm the order they are written down')
    logger.info('')
    logger.info('')
    logger.info(recoverySeed)
  } catch (e) {
    logger.error(handleError(e))
  }
}

/**
 * Unlock a wallet
 *
 * ex: `sparkswap wallet unlock`
 *
 * @function
 * @param {Object} args
 * @param {String} args.symbol
 * @param {Object} opts
 * @param {String} [opts.rpcAddress=null]
 * @param {Logger} logger
 * @return {Void}
 */
async function unlock (args, opts, logger) {
  const { symbol } = args
  const { rpcAddress = null } = opts

  try {
    const client = new BrokerDaemonClient(rpcAddress)
    const password = await askQuestion(`Enter the wallet password:`, { silent: true })
    await client.walletService.unlockWallet({ symbol, password })
    logger.info(`Successfully Unlocked ${symbol.toUpperCase()} Wallet!`.green)
  } catch (e) {
    logger.error(handleError(e))
  }
}

module.exports = (program) => {
  program
    .command('wallet', 'Commands to handle a wallet instance')
    .help(`Available Commands: ${Object.values(SUPPORTED_COMMANDS).join(', ')}`)
    .argument('<command>', '', Object.values(SUPPORTED_COMMANDS), null, true)
    .argument('[sub-arguments...]')
    .option('--rpc-address [rpc-address]', 'Location of the RPC server to use.', validations.isHost)
    .option('--market [marketName]', 'Relevant market name', validations.isMarketName)
    // For each subcommand, we are required to add any `.options` before the `.action`
    // hook has been added in caporal. If the option is omitted, the subcommand will
    // not receive the variable in the `opts` object
    .option('--wallet-address [address]', 'used in sparkswap withdraw ONLY')
    .option('--force', 'Force close all channels. This options is only used in the sparkswap release command', null, false)
    .action(async (args, opts, logger) => {
      const { command, subArguments } = args
      const { market } = opts

      // TODO: Figure out a way to handle subArguments that could be dynamic
      // for each command
      let [symbol = '', amount = ''] = subArguments

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
        case SUPPORTED_COMMANDS.COMMIT:
          symbol = symbol.toUpperCase()

          if (!Object.values(SUPPORTED_SYMBOLS).includes(symbol)) {
            throw new Error(`Provided symbol is not a valid currency for the exchange`)
          }

          args.symbol = symbol
          args.amount = amount
          opts.market = validations.isMarketName(market)

          return commit(args, opts, logger)
        case SUPPORTED_COMMANDS.NETWORK_ADDRESS:
          symbol = symbol.toUpperCase()

          if (!Object.values(SUPPORTED_SYMBOLS).includes(symbol)) {
            throw new Error(`Provided symbol is not a valid currency to retrieve a public key`)
          }

          args.symbol = symbol

          return networkAddress(args, opts, logger)
        case SUPPORTED_COMMANDS.NETWORK_STATUS:
          opts.market = validations.isMarketName(market)
          return networkStatus(args, opts, logger)
        case SUPPORTED_COMMANDS.RELEASE:
          args.market = validations.isMarketName(market)
          return release(args, opts, logger)
        case SUPPORTED_COMMANDS.WITHDRAW:
          symbol = symbol.toUpperCase()
          const { walletAddress } = opts

          if (!Object.values(SUPPORTED_SYMBOLS).includes(symbol)) {
            throw new Error(`Provided symbol is not a valid currency for the broker`)
          }

          args.symbol = symbol
          args.amount = amount
          args.address = walletAddress

          return withdraw(args, opts, logger)
        case SUPPORTED_COMMANDS.CREATE:
          symbol = symbol.toUpperCase()

          if (!Object.values(SUPPORTED_SYMBOLS).includes(symbol)) {
            throw new Error(`Provided symbol is not a valid currency for the broker`)
          }

          args.symbol = symbol

          return create(args, opts, logger)
        case SUPPORTED_COMMANDS.UNLOCK:
          symbol = symbol.toUpperCase()

          if (!Object.values(SUPPORTED_SYMBOLS).includes(symbol)) {
            throw new Error(`Provided symbol is not a valid currency for the broker`)
          }

          args.symbol = symbol

          return unlock(args, opts, logger)
      }
    })
    .command(`wallet ${SUPPORTED_COMMANDS.BALANCE}`, 'Current daemon wallet balance')
    .command(`wallet ${SUPPORTED_COMMANDS.NEW_DEPOSIT_ADDRESS}`, 'Generates a new wallet address for a daemon instance')
    .argument('<symbol>', `Supported currencies for the exchange: ${SUPPORTED_SYMBOLS.join('/')}`)
    .command(`wallet ${SUPPORTED_COMMANDS.COMMIT}`)
    .argument('<symbol>', `Supported currencies for the exchange: ${SUPPORTED_SYMBOLS.join('/')}`)
    .argument('[amount]', 'Amount of currency to commit to the relayer', validations.isDecimal)
    .option('--market [marketName]', 'Relevant market name', validations.isMarketName)
    .command(`wallet ${SUPPORTED_COMMANDS.NETWORK_ADDRESS}`, 'Payment Channel Network Public key for a given currency')
    .argument('<symbol>', `Supported currencies: ${SUPPORTED_SYMBOLS.join('/')}`)
    .command(`wallet ${SUPPORTED_COMMANDS.NETWORK_STATUS}`, 'Payment Channel Network status for trading in different markets')
    .option('--market [marketName]', 'Relevant market name', validations.isMarketName)
    .command(`wallet ${SUPPORTED_COMMANDS.RELEASE}`, 'Closes channels open on the specified market')
    .option('--market <marketName>', 'Relevant market name', validations.isMarketName, null, true)
    .option('--force', 'Force close all channels', null, false)
    .command(`wallet ${SUPPORTED_COMMANDS.WITHDRAW}`, 'Withdraws specified amount of coin from wallet')
    .argument('<symbol>', `Supported currencies: ${SUPPORTED_SYMBOLS.join('/')}`)
    .argument('<amount>', 'Amount of currency to commit to the relayer', validations.isDecimal)
    .option('--wallet-address <wallet-address>', 'Address to send the coins to', validations.isHost)
    .command(`wallet ${SUPPORTED_COMMANDS.CREATE}`, 'Create a wallet')
    .argument('<symbol>', `Supported currencies: ${SUPPORTED_SYMBOLS.join('/')}`)
    .command(`wallet ${SUPPORTED_COMMANDS.UNLOCK}`, 'Unlock a wallet')
    .argument('<symbol>', `Supported currencies: ${SUPPORTED_SYMBOLS.join('/')}`)
}
