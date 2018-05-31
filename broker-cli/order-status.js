const BrokerDaemonClient = require('./broker-daemon-client')
const { validations } = require('./utils')

/**
 * kcli orderstatus
 *
 * ex: `kcli orderstatus Aar_w9XuTtUqeqeaac5liIMR-Lqf1dJfKZikTkhJ'
 *
 * @param {Object} args
 * @param {String} args.blockOrderId
 * @param {String} [rpcaddress] opts.rpcaddress
 * @param {Logger} logger
 */
async function orderStatus (args, opts, logger) {
  const { blockOrderId } = args
  const { rpcAddress = null } = opts

  const request = {
    blockOrderId
  }

  try {
    const blockOrderResult = await new BrokerDaemonClient(rpcAddress).getBlockOrder(request)
    logger.info(blockOrderResult)
  } catch (e) {
    logger.error(e.toString())
  }
};

module.exports = (program) => {
  program
    .command('orderstatus', 'Get status of a block order.')
    .argument('<blockOrderId>', 'Block order to get status of.', validations.isBlockOrderId)
    .option('--rpc-address', 'Location of the RPC server to use.', validations.isHost)
    .action(orderStatus)
}
