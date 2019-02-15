const BrokerDaemonClient = require('../../broker-daemon-client')
const { handleError } = require('../../utils')

/**
 * sparkswap order cancel-all
 *
 * ex: `sparkswap order cancel-all --market btc/ltc'
 *
 * @param {Object} args
 * @param {String} args.market
 * @param {String} [rpcaddress] opts.rpcaddress
 * @param {Logger} logger
 */
async function cancelAll (args, opts, logger) {
  const {
    rpcAddress,
    market
  } = opts

  const request = {
    market
  }

  try {
    const client = new BrokerDaemonClient(rpcAddress)
    await client.orderService.cancelAllBlockOrders(request)
    logger.info(`Cancelled all orders on ${market} market`)
  } catch (e) {
    logger.error(handleError(e))
  }
};

module.exports = cancelAll
