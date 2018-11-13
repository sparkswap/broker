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
  WITHDRAW: 'withdraw'
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
  const { rpcAddress = null } = opts

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
  const { rpcAddress = null, market } = opts
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
  const { rpcAddress = null } = opts

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
  const { market, rpcAddress = null } = opts

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
  const { rpcAddress = null, market } = opts

  try {
    const client = new BrokerDaemonClient(rpcAddress)

    const answer = await askQuestion(`Are you sure you want to close all channels you have open on the ${market} market? (Y/N)`)

    if (!ACCEPTED_ANSWERS.includes(answer.toLowerCase())) return

    await client.walletService.releaseChannels({market})
    logger.info(`Successfully closed channels on ${market} market!`)
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
  const { rpcAddress = null } = opts

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

module.exports = (program) => {
  program
    .command('wallet', 'Commands to handle a wallet instance')
    .help(`Available Commands: ${Object.values(SUPPORTED_COMMANDS).join(', ')}`)
    .argument('<command>', '', Object.values(SUPPORTED_COMMANDS), null, true)
    .argument('[sub-arguments...]')
    .option('--rpc-address', 'Location of the RPC server to use.', validations.isHost)
    .option('--market [marketName]', 'Relevant market name', validations.isMarketName)
    .option('--wallet-address [address]', 'Address to send the coins to', validations.isHost)
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
          opts.market = validations.isMarketName(market)
          return release(args, opts, logger)
        case SUPPORTED_COMMANDS.WITHDRAW:
          symbol = symbol.toUpperCase()
          const { walletAddress } = opts

          if (!Object.values(SUPPORTED_SYMBOLS).includes(symbol)) {
            throw new Error(`Provided symbol is not a valid currency for the exchange`)
          }

          args.symbol = symbol
          args.amount = amount
          args.address = walletAddress

          return withdraw(args, opts, logger)
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
    .option('--market [marketName]', 'Relevant market name', validations.isMarketName)
    .command(`wallet ${SUPPORTED_COMMANDS.WITHDRAW}`, 'Withdraws specified amount of coin from wallet')
    .argument('<symbol>', `Supported currencies: ${SUPPORTED_SYMBOLS.join('/')}`)
    .argument('<amount>', 'Amount of currency to commit to the relayer', validations.isDecimal)
    .option('--wallet-address', 'Address to send the coins to', validations.isHost)
}
