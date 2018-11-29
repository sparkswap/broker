const BrokerDaemonClient = require('../../broker-daemon-client')
const { handleError } = require('../../utils')

/**
 * sparkswap order cancel
 *
 * ex: `sparkswap order cancel Aar_w9XuTtUqeqeaac5liIMR-Lqf1dJfKZikTkhJ'
 *
 * @param {Object} args
 * @param {String} args.blockOrderId
 * @param {String} [rpcaddress] opts.rpcaddress
 * @param {Logger} logger
 */
async function cancel (args, opts, logger) {
  const { blockOrderId } = args
  const { rpcAddress } = opts

  const request = {
    blockOrderId
  }

  try {
    const client = new BrokerDaemonClient(rpcAddress)
    await client.orderService.cancelBlockOrder(request)
    logger.info(`Cancelled ${blockOrderId}`)
  } catch (e) {
    logger.error(handleError(e))
  }
};

module.exports = cancel
