const { validations } = require('../../utils')
const { RPC_ADDRESS_HELP_STRING, MARKET_NAME_HELP_STRING } = require('../../utils/strings')
/**
 * Order
 * @module broker-cli/order
 */

/**
 * Supported commands for `sparkswap order`
 *
 * @constant
 * @type {Object<key, String>}
 * @default
 */
const SUPPORTED_COMMANDS = Object.freeze({
  STATUS: 'status',
  CANCEL: 'cancel',
  SUMMARY: 'summary',
  CANCEL_ALL: 'cancel-all',
  TRADE_HISTORY: 'trade-history'
})

const status = require('./status')
const cancel = require('./cancel')
const summary = require('./summary')
const cancelAll = require('./cancel-all')
const tradeHistory = require('./trade-history')

module.exports = (program) => {
  program
    .command('order', 'Commands to manage block orders')
    .help(`Available Commands: ${Object.values(SUPPORTED_COMMANDS).join(', ')}`)
    .argument('<command>', '', Object.values(SUPPORTED_COMMANDS), null, true)
    .argument('[sub-arguments...]')
    .option('--market <marketName>', MARKET_NAME_HELP_STRING, validations.isMarketName, null, true)
    .option('--limit [limit]', 'Limit of records returned from summary', program.INT)
    .option('--active', 'Only return active records from summary', program.BOOL)
    .option('--cancelled', 'Only return cancelled records from summary', program.BOOL)
    .option('--completed', 'Only return completed records from summary', program.BOOL)
    .option('--failed', 'Only return failed records from summary', program.BOOL)
    .option('--rpc-address [rpc-address]', RPC_ADDRESS_HELP_STRING, validations.isHost)
    .action(async (args, opts, logger) => {
      const {
        command,
        subArguments
      } = args

      const {
        market,
        limit,
        active,
        cancelled,
        completed,
        failed
      } = opts

      let blockOrderId

      switch (command) {
        case SUPPORTED_COMMANDS.STATUS:
          [blockOrderId] = subArguments

          args.blockOrderId = validations.isBlockOrderId(blockOrderId || '')

          return status(args, opts, logger)
        case SUPPORTED_COMMANDS.CANCEL:
          [blockOrderId] = subArguments

          args.blockOrderId = validations.isBlockOrderId(blockOrderId || '')

          return cancel(args, opts, logger)

        case SUPPORTED_COMMANDS.SUMMARY:
          opts = {
            market: validations.isMarketName(market),
            limit,
            active,
            cancelled,
            completed,
            failed
          }
          return summary(args, opts, logger)

        case SUPPORTED_COMMANDS.CANCEL_ALL:
          opts.market = validations.isMarketName(market)
          return cancelAll(args, opts, logger)

        case SUPPORTED_COMMANDS.TRADE_HISTORY:
          return tradeHistory(args, opts, logger)
      }
    })
    .command(`order ${SUPPORTED_COMMANDS.SUMMARY}`, 'View your orders')
    .option('--market <marketName>', MARKET_NAME_HELP_STRING, validations.isMarketName, null, true)
    .option('--limit [limit]', 'Limit of records returned from summary', program.INT)
    .option('--active [active]', 'Only return active records from summary', program.BOOL)
    .option('--cancelled [cancelled]', 'Only return cancelled records from summary', program.BOOL)
    .option('--completed [completed]', 'Only return completed records from summary', program.BOOL)
    .option('--failed [failed]', 'Only return failed records from summary', program.BOOL)
    .option('--rpc-address [rpc-address]', RPC_ADDRESS_HELP_STRING, validations.isHost)
    .command(`order ${SUPPORTED_COMMANDS.STATUS}`, 'Get the status of a block order')
    .argument('<blockOrderId>', 'Block order to get status of', validations.isBlockOrderId)
    .option('--market <marketName>', MARKET_NAME_HELP_STRING, validations.isMarketName, null, true)
    .option('--rpc-address [rpc-address]', RPC_ADDRESS_HELP_STRING, validations.isHost)
    .command(`order ${SUPPORTED_COMMANDS.CANCEL}`, 'Cancel a block order')
    .argument('<blockOrderId>', 'Block Order to cancel.', validations.isBlockOrderId, null, true)
    .option('--market <marketName>', MARKET_NAME_HELP_STRING, validations.isMarketName, null, true)
    .option('--rpc-address [rpc-address]', RPC_ADDRESS_HELP_STRING, validations.isHost)
    .command(`order ${SUPPORTED_COMMANDS.CANCEL_ALL}`, 'Cancel all block orders on market')
    .option('--market <marketName>', MARKET_NAME_HELP_STRING, validations.isMarketName, null, true)
    .option('--rpc-address [rpc-address]', RPC_ADDRESS_HELP_STRING, validations.isHost)
    .command(`order ${SUPPORTED_COMMANDS.TRADE_HISTORY}`, 'Get information about completed and processing trades')
    .option('--rpc-address [rpc-address]', RPC_ADDRESS_HELP_STRING, validations.isHost)
}
