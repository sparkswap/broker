const { validations } = require('../../utils')
/**
 * Order
 * @module broker-cli/order
 */

/**
 * Supported commands for `sparkswap info`
 *
 * @constant
 * @type {Object<key, String>}
 * @default
 */
const SUPPORTED_COMMANDS = Object.freeze({
  SUPPORTED_MARKETS: 'supported-markets'
})

const supportedMarkets = require('./supported-markets')

module.exports = (program) => {
  program
    .command('info', 'Commands to get market, trading, and fee information')
    .help('Available Commands: supported-markets')
    .argument('<command>', '', Object.values(SUPPORTED_COMMANDS), null, true)
    .argument('[sub-arguments...]')
    .option('--rpc-address', 'Location of the RPC server to use.', validations.isHost)
    .action(async (args, opts, logger) => {
      const { command } = args

      switch (command) {
        case SUPPORTED_COMMANDS.SUPPORTED_MARKETS:
          return supportedMarkets(opts, logger)
      }
    })
    .command(`info ${SUPPORTED_COMMANDS.SUPPORTED_MARKETS}`, 'Get the markets currently supported')
    .option('--rpc-address', 'Location of the RPC server to use.', validations.isHost)
}
