const { validations } = require('../../utils')
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
  SUMMARY: 'summary'
})

const status = require('./status')
const cancel = require('./cancel')
const summary = require('./summary')

module.exports = (program) => {
  program
    .command('order', 'Commands to manage block orders')
    .help(`Available Commands: ${Object.values(SUPPORTED_COMMANDS).join(', ')}`)
    .argument('<command>', '', Object.values(SUPPORTED_COMMANDS), null, true)
    .argument('[sub-arguments...]')
    .option('--rpc-address [rpc-address]', 'Location of the RPC server to use.', validations.isHost)
    .option('--market [marketName]', 'Relevant market name', validations.isMarketName)
    .action(async (args, opts, logger) => {
      const { command, subArguments } = args

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
          const { market } = opts
          opts.market = validations.isMarketName(market)
          return summary(args, opts, logger)
      }
    })
    .command(`order ${SUPPORTED_COMMANDS.STATUS}`, 'Get the status of a block order')
    .argument('<blockOrderId>', 'Block order to get status of.', validations.isBlockOrderId)
    .option('--rpc-address [rpc-address]', 'Location of the RPC server to use.', validations.isHost)
    .option('--market [marketName]', 'Relevant market name', validations.isMarketName)
    .command(`order ${SUPPORTED_COMMANDS.CANCEL}`, 'Cancel a block order')
    .argument('<blockOrderId>', 'Block Order to cancel.', validations.isBlockOrderId)
    .option('--rpc-address [rpc-address]', 'Location of the RPC server to use.', validations.isHost)
    .option('--market [marketName]', 'Relevant market name', validations.isMarketName)
    .command(`order ${SUPPORTED_COMMANDS.SUMMARY}`, 'View your orders.')
    .option('--rpc-address [rpc-address]', 'Location of the RPC server to use.', validations.isHost)
    .option('--market [marketName]', 'Relevant market name', validations.isMarketName)
}
