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
})

const supportedMarkets = require('./supported-markets')
const marketStats = require('./market-stats')

module.exports = (program) => {
  program
    .command('market', 'Commands to get market, trading, and fee information')
    .help(`Available Commands: ${Object.values(SUPPORTED_COMMANDS).join(', ')}`)
    .argument('<command>', '', Object.values(SUPPORTED_COMMANDS), null, true)
    .argument('[sub-arguments...]')
    .option('--market <marketName>', MARKET_NAME_HELP_STRING, validations.isMarketName, null, true)
    .option('--rpc-address [rpc-address]', RPC_ADDRESS_HELP_STRING, validations.isHost)
    .action(async (args, opts, logger) => {
      const { command } = args
      const { market } = opts

      switch (command) {
        case SUPPORTED_COMMANDS.SUPPORTED_MARKETS:
          return supportedMarkets(opts, logger)
        case SUPPORTED_COMMANDS.MARKET_STATS:
          opts.market = validations.isMarketName(market)
          return marketStats(opts, logger)
      }
    })
    .command(`market ${SUPPORTED_COMMANDS.SUPPORTED_MARKETS}`, 'Get the markets currently supported')
    .option('--rpc-address [rpc-address]', RPC_ADDRESS_HELP_STRING, validations.isHost)
    .command(`market ${SUPPORTED_COMMANDS.MARKET_STATS}`, 'Get statistics (price ticker information) for a particular market for a period of the last 24 hours')
    .option('--market <marketName>', MARKET_NAME_HELP_STRING, validations.isMarketName, null, true)
    .argument('<since>', 'Start datetime in ISO format e.g. 2018-04-23T10:26:00.996Z', validations.isDate)
    .argument('<limit>', 'Number of records to be retrieved', validations.isPositiveInteger)
    .option('--market <marketName>', MARKET_NAME_HELP_STRING, validations.isMarketName, null, true)
    .option('--rpc-address [rpc-address]', RPC_ADDRESS_HELP_STRING, validations.isHost)
}
