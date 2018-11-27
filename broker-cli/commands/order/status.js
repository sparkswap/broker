const BrokerDaemonClient = require('../../broker-daemon-client')
const { handleError } = require('../../utils')

/**
 * sparkswap order status
 *
 * ex: `sparkswap order status Aar_w9XuTtUqeqeaac5liIMR-Lqf1dJfKZikTkhJ'
 *
 * @param {Object} args
 * @param {String} args.blockOrderId
 * @param {String} [rpcaddress] opts.rpcaddress
 * @param {Logger} logger
 */
async function status (args, opts, logger) {
  const { blockOrderId } = args
  const { rpcAddress } = opts

  const request = {
    blockOrderId
  }

  try {
    const client = new BrokerDaemonClient(rpcAddress)
    const blockOrderResult = await client.orderService.getBlockOrder(request)
    logger.info(blockOrderResult)
  } catch (e) {
    logger.error(handleError(e))
  }
};

module.exports = status
