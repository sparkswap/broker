const { validations } = require('../../utils')
const { RPC_ADDRESS_HELP_STRING, MARKET_NAME_HELP_STRING } = require('../../utils/strings')

/**
 * Market
 * @module broker-cli/market
 */

/**
 * Supported commands for `sparkswap market`
 *
 * @constant
 * @type {Object<key, String>}
 * @default
 */
const SUPPORTED_COMMANDS = Object.freeze({
  SUPPORTED_MARKETS: 'supported-markets',
  MARKET_STATS: 'market-stats',
  TRADES: 'trades'
})

const supportedMarkets = require('./supported-markets')
const marketStats = require('./market-stats')
const trades = require('./trades')

module.exports = (program) => {
  program
    .command('market', 'Commands to get market, trading, and fee information')
    .help(`Available Commands: ${Object.values(SUPPORTED_COMMANDS).join(', ')}`)
    .argument('<command>', '', Object.values(SUPPORTED_COMMANDS), null, true)
    .argument('[sub-arguments...]')
    .option('--market <marketName>', MARKET_NAME_HELP_STRING, validations.isMarketName, null, true)
    .option('--rpc-address [rpc-address]', RPC_ADDRESS_HELP_STRING, validations.isHost)
    .action(async (args, opts, logger) => {
      const { command, subArguments } = args
      const { market } = opts

      switch (command) {
        case SUPPORTED_COMMANDS.SUPPORTED_MARKETS:
          return supportedMarkets(opts, logger)
        case SUPPORTED_COMMANDS.MARKET_STATS:
          opts.market = validations.isMarketName(market)
          return marketStats(opts, logger)
        case SUPPORTED_COMMANDS.TRADES:
          const [since, limit] = subArguments
          args.since = since
          args.limit = limit

          opts.market = validations.isMarketName(market)
          return trades(args, opts, logger)
      }
    })
    .command(`market ${SUPPORTED_COMMANDS.SUPPORTED_MARKETS}`, 'Get the markets currently supported')
    .option('--rpc-address [rpc-address]', RPC_ADDRESS_HELP_STRING, validations.isHost)
    .command(`market ${SUPPORTED_COMMANDS.MARKET_STATS}`, 'Get statistics (price ticker information) for a particular market for a period of the last 24 hours')
    .option('--market <marketName>', MARKET_NAME_HELP_STRING, validations.isMarketName, null, true)
    .command(`market ${SUPPORTED_COMMANDS.TRADES}`, 'Get detailed information about trades from a given time range')
    .argument('<since>', 'Start datetime in ISO format e.g. 2018-04-23T10:26:00.996Z', validations.isDate)
    .argument('<limit>', 'Number of records to be retrieved', validations.isPositiveInteger)
    .option('--market <marketName>', MARKET_NAME_HELP_STRING, validations.isMarketName, null, true)
    .option('--rpc-address [rpc-address]', RPC_ADDRESS_HELP_STRING, validations.isHost)
}
