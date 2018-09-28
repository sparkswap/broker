const { validations } = require('../../utils')

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
    .option('--rpc-address', 'Location of the RPC server to use.', validations.isHost)
    .option('--market [marketName]', 'Relevant market name', validations.isMarketName)
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
    .option('--rpc-address', 'Location of the RPC server to use.', validations.isHost)
    .command(`info ${SUPPORTED_COMMANDS.MARKET_STATS}`, 'Get the markets currently supported')
    .option('--market [marketName]', 'Relevant market name')
    .command(`info ${SUPPORTED_COMMANDS.TRADES}`, 'Get the markets currently supported')
    .argument('<since>', 'Datetime for lowerbound of range.', validations.isDate)
    .argument('<limit>', 'Number of records to be retrieved', validations.isPositiveInteger)
    .option('--rpc-address', 'Location of the RPC server to use.', validations.isHost)
    .option('--market [marketName]', 'Relevant market name', validations.isMarketName)
}
