const BrokerDaemonClient = require('../../broker-daemon-client')
const { handleError } = require('../../utils')

/**
 *
 * ex: `sparkswap info market-stats --market btc/ltc'
 *
 * @param {Object} opts
 * @param {String} opts.market
 * @param {String} [rpcaddress] opts.rpcaddress
 * @param {Logger} logger
 */
async function marketStats (opts, logger) {
  const { market, rpcAddress, json } = opts

  try {
    const client = new BrokerDaemonClient(rpcAddress)
    const stats = await client.infoService.getMarketStats({ market })
    if (json) {
      logger.info(JSON.stringify(stats))
      return
    }
    logger.info(stats)
  } catch (e) {
    logger.error(handleError(e))
  }
};

module.exports = marketStats
