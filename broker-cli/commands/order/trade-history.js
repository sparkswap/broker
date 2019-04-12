const BrokerDaemonClient = require('../../broker-daemon-client')
const { handleError } = require('../../utils')

/**
 * sparkswap order status
 *
 * ex: `sparkswap order status Aar_w9XuTtUqeqeaac5liIMR-Lqf1dJfKZikTkhJ'
 *
 * @param {Object} args
 * @param {string} args.blockOrderId
 * @param {Object} opts
 * @param {string} opts.rpcaddress
 * @param {Logger} logger
 */
async function tradeHistory (args, opts, logger) {
  const { rpcAddress } = opts
  try {
    const client = new BrokerDaemonClient(rpcAddress)
    const blockOrderResult = await client.orderService.getTradeHistory({})
    logger.info(blockOrderResult)
  } catch (e) {
    logger.error(handleError(e))
  }
};

module.exports = tradeHistory
