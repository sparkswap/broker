const { validations } = require('../utils')
/**
 * Order
 * @module broker-cli/order
 */

/**
 * Supported commands for `kcli order`
 *
 * @constant
 * @type {Object<key, String>}
 * @default
 */
const SUPPORTED_COMMANDS = Object.freeze({
  STATUS: 'status',
  CANCEL: 'cancel'
})

const status = require('./status')
const cancel = require('./cancel')

module.exports = (program) => {
  program
    .command('order', 'Commands to manage block orders')
    .help('Available Commands: status')
    .argument('<command>', '', Object.values(SUPPORTED_COMMANDS), null, true)
    .argument('[sub-arguments...]')
    .option('--rpc-address', 'Location of the RPC server to use.', validations.isHost)
    .action(async (args, opts, logger) => {
      const { command, subArguments } = args

      switch (command) {
        case SUPPORTED_COMMANDS.STATUS:
          var [blockOrderId] = subArguments

          args.blockOrderId = validations.isBlockOrderId(blockOrderId || '')

          return status(args, opts, logger)
        case SUPPORTED_COMMANDS.CANCEL:
          var [blockOrderId] = subArguments

          args.blockOrderId = validations.isBlockOrderId(blockOrderId || '')

          return cancel(args, opts, logger)
      }
    })
    .command(`order ${SUPPORTED_COMMANDS.STATUS}`, 'Get the status of a block order')
    .argument('<blockOrderId>', 'Block order to get status of.', validations.isBlockOrderId)
    .command(`order ${SUPPORTED_COMMANDS.CANCEL}`, 'Cancel a block order')
    .argument('<blockOrderId>', 'Block Order to cancel.', validations.isBlockOrderId)
}
