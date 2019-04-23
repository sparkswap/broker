const BrokerDaemonClient = require('../../broker-daemon-client')
const { handleError } = require('../../utils')

/**
 * sparkswap order trade-history
 *
 * ex: `sparkswap order trade-history'
 *
 * @param {Object} args
 * @param {Object} opts
 * @param {string} opts.rpcaddress
 * @param {Logger} logger
 */
async function tradeHistory (args, opts, logger) {
  const { rpcAddress } = opts
  try {
    const client = new BrokerDaemonClient(rpcAddress)
    const tradeHistory = await client.orderService.getTradeHistory({})
    logger.info(JSON.stringify(tradeHistory, null, 2))
  } catch (e) {
    logger.error(handleError(e))
  }
};

module.exports = tradeHistory
