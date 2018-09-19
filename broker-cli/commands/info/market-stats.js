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
async function supportedMarkets (opts, logger) {
  const { market, rpcAddress = null } = opts

  try {
    const client = new BrokerDaemonClient(rpcAddress)
    const marketStats = await client.infoService.getMarketStats({ market })
    logger.info(marketStats)
  } catch (e) {
    logger.error(handleError(e))
  }
};

module.exports = supportedMarkets
