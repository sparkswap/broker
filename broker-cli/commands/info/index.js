const { validations } = require('../../utils')
const { RPC_ADDRESS_HELP_STRING, MARKET_NAME_HELP_STRING, JSON_FORMAT_STRING } = require('../../utils/strings')

/**
 * Info
 * @module broker-cli/info
 */

/**
 * Supported commands for `sparkswap info`
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
    .command('info', 'Commands to get market, trading, and fee information')
    .help(`Available Commands: ${Object.values(SUPPORTED_COMMANDS).join(', ')}`)
    .argument('<command>', '', Object.values(SUPPORTED_COMMANDS), null, true)
    .argument('[sub-arguments...]')
    .option('--rpc-address [rpc-address]', RPC_ADDRESS_HELP_STRING, validations.isHost)
    .option('--market [marketName]', MARKET_NAME_HELP_STRING, validations.isMarketName)
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
    .command(`info ${SUPPORTED_COMMANDS.SUPPORTED_MARKETS}`, 'Get the markets currently supported')
    .option('--rpc-address [rpc-address]', RPC_ADDRESS_HELP_STRING, validations.isHost)
    .option('--json', JSON_FORMAT_STRING, program.BOOLEAN)
    .command(`info ${SUPPORTED_COMMANDS.MARKET_STATS}`, 'Get statistics (price ticker information) for a particular market for a period of the last 24 hours')
    .option('--market [marketName]', MARKET_NAME_HELP_STRING, validations.isMarketName)
    .option('--json', JSON_FORMAT_STRING, program.BOOLEAN)
    .command(`info ${SUPPORTED_COMMANDS.TRADES}`, 'Get detailed information about trades from a given time range')
    .argument('<since>', 'Start datetime in ISO format e.g. 2018-04-23T10:26:00.996Z', validations.isDate)
    .argument('<limit>', 'Number of records to be retrieved', validations.isPositiveInteger)
    .option('--rpc-address [rpc-address]', RPC_ADDRESS_HELP_STRING, validations.isHost)
    .option('--market [marketName]', MARKET_NAME_HELP_STRING, validations.isMarketName)
    .option('--json', JSON_FORMAT_STRING, program.BOOLEAN)
}
