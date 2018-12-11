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

    balances.forEach((balance) => {
      let {
        symbol,
        error = null,
        totalChannelBalance,
        totalPendingChannelBalance,
        uncommittedBalance,
        uncommittedPendingBalance
      } = balance

      totalChannelBalance = error ? 'Not Available'.yellow : totalChannelBalance.green
      uncommittedBalance = error ? 'Not Available'.yellow : uncommittedBalance

      // We fix all pending balances to 8 decimal places due to aesthetics. Since
      // this balance should only be temporary, we do not care as much about precision
      totalPendingChannelBalance = error ? '' : `(${Big(totalPendingChannelBalance).toFixed(8)})`.grey
      uncommittedPendingBalance = error ? '' : `(${Big(uncommittedPendingBalance).toFixed(8)})`.grey

      balancesTable.push([
        symbol,
        `${totalChannelBalance} ${totalPendingChannelBalance}`,
        `${uncommittedBalance} ${uncommittedPendingBalance}`
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

    const { uncommittedBalance, error } = balances.find(({ symbol: s }) => s === symbol)

    if (error) {
      throw new Error(`Error fetching current balances from ${symbol} engine`)
    }

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
 * Different network statuses
 * @constant
 * @type {Object}
 * @default
 */
const NETWORK_STATUSES = Object.freeze({
  AVAILABLE: 'AVAILABLE',
  OUTSTANDING: 'OUTSTANDING',
  PENDING: 'PENDING',
  INACTIVE: 'INACTIVE'
})

/**
 * Formats the capacities to fixed numbers and colors them if they are greater
 * than 0. Will return Not Available if balance is empty
 *
 * @function
 * @param {String} balance
 * @param {String} status
 * @return {String} balance - formatted with size and color
 */
function formatBalance (balance, status) {
  // If there were errors when receiving balances, the balance will come back
  // as either a blank string, undefined or null. We set the balance to `Not Available`
  // in this case, but should make sure we dont treat `0` as the same type.
  if (balance === '' || balance == null) {
    return 'Not Available'.yellow
  }

  const fixedBalance = Big(balance).toFixed(16)

  if (Big(balance).gt(0)) {
    switch (status) {
      case NETWORK_STATUSES.AVAILABLE:
        return fixedBalance.green
      case NETWORK_STATUSES.OUTSTANDING:
        return fixedBalance.yellow
      case NETWORK_STATUSES.PENDING:
        return fixedBalance.yellow
      case NETWORK_STATUSES.INACTIVE:
        return fixedBalance.red
    }
  }

  return fixedBalance
}

/**
 * @constant
 * @type {Object<key, String>}
 * @default
 */
const CAPACITY_STATUSES = Object.freeze({
  OK: 'OK'
})

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

    const baseSymbol = baseSymbolCapacities.symbol.toUpperCase()
    const counterSymbol = counterSymbolCapacities.symbol.toUpperCase()

    const statusTable = new Table({
      head: ['', `${baseSymbol} Capacity`, `${counterSymbol} Capacity`],
      style: { head: ['gray'] }
    })

    // If any balances in the following table are empty (which occurs if the engine is unavailable)
    // then the text will show up as `Not Available`.
    //
    // The user will then be prompted with a warning letting them know that we failed
    // to receive a balance for a particular currency
    statusTable.push(['Available', '', ''])
    statusTable.push([`  Buy ${baseSymbol}`, formatBalance(baseSymbolCapacities.availableReceiveCapacity, NETWORK_STATUSES.AVAILABLE), formatBalance(counterSymbolCapacities.availableSendCapacity, NETWORK_STATUSES.AVAILABLE)])
    statusTable.push([`  Sell ${baseSymbol}`, formatBalance(baseSymbolCapacities.availableSendCapacity, NETWORK_STATUSES.AVAILABLE), formatBalance(counterSymbolCapacities.availableReceiveCapacity, NETWORK_STATUSES.AVAILABLE)])

    statusTable.push(['Outstanding', '', ''])
    statusTable.push([`  Buy ${baseSymbol}`, formatBalance(baseSymbolCapacities.outstandingReceiveCapacity, NETWORK_STATUSES.OUTSTANDING), formatBalance(counterSymbolCapacities.outstandingSendCapacity, NETWORK_STATUSES.OUTSTANDING)])
    statusTable.push([`  Sell ${baseSymbol}`, formatBalance(baseSymbolCapacities.outstandingSendCapacity, NETWORK_STATUSES.OUTSTANDING), formatBalance(counterSymbolCapacities.outstandingReceiveCapacity, NETWORK_STATUSES.OUTSTANDING)])

    statusTable.push(['Pending', '', ''])
    statusTable.push([`  Buy ${baseSymbol}`, formatBalance(baseSymbolCapacities.pendingReceiveCapacity, NETWORK_STATUSES.PENDING), formatBalance(counterSymbolCapacities.pendingSendCapacity, NETWORK_STATUSES.PENDING)])
    statusTable.push([`  Sell ${baseSymbol}`, formatBalance(baseSymbolCapacities.pendingSendCapacity, NETWORK_STATUSES.PENDING), formatBalance(counterSymbolCapacities.pendingReceiveCapacity, NETWORK_STATUSES.PENDING)])

    statusTable.push(['Inactive', '', ''])
    statusTable.push([`  Buy ${baseSymbol}`, formatBalance(baseSymbolCapacities.inactiveReceiveCapacity, NETWORK_STATUSES.INACTIVE), formatBalance(counterSymbolCapacities.inactiveSendCapacity, NETWORK_STATUSES.INACTIVE)])
    statusTable.push([`  Sell ${baseSymbol}`, formatBalance(baseSymbolCapacities.inactiveSendCapacity, NETWORK_STATUSES.INACTIVE), formatBalance(counterSymbolCapacities.inactiveReceiveCapacity, NETWORK_STATUSES.INACTIVE)])

    logger.info(` Market: ${market.bold.white}`)
    logger.info(statusTable.toString())
    logger.info('')

    if (baseSymbolCapacities.status !== CAPACITY_STATUSES.OK) {
      logger.error(`${baseSymbol}: Received errors when requesting network status: ${baseSymbolCapacities.error}`.red)
    }

    if (counterSymbolCapacities.status !== CAPACITY_STATUSES.OK) {
      logger.error(`${counterSymbol}: Received errors when requesting network status: ${counterSymbolCapacities.error}`.red)
    }
  } catch (e) {
    logger.error(handleError(e))
  }
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
      let shouldForceRelease = false

      const { base, counter } = await client.walletService.releaseChannels({ market, force })

      const marketSides = [base, counter]

      marketSides.forEach((side) => {
        const { symbol, status } = side
        let { error = '' } = side

        if (error.includes('Inactive/pending channels exist. You must use `force` to close')) {
          error = `Unable to release ${symbol}. Use '--force' and try again`
          shouldForceRelease = true
        }

        if (error) {
          logger.info(`${symbol}: ` + `${status}: ${error}`.red)
        } else {
          logger.info(`${symbol}: ` + status.green)
        }
      })

      if (shouldForceRelease && !force) {
        logger.info('')
        logger.info('NOTE: using `--force` has the potential to lock your funds for an'.yellow)
        logger.info('extended period of time (24/48 hours) and can cost additional fees.'.yellow)
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
