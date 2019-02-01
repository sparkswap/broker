const BrokerDaemonClient = require('../../broker-daemon-client')
const { handleError } = require('../../utils')

/**
 *
 * ex: `sparkswap info supported-markets'
 *
 * @param {Object} opts
 * @param {String} [rpcaddress] opts.rpcaddress
 * @param {Logger} logger
 */
async function supportedMarkets (opts, logger) {
  const { rpcAddress = null, json } = opts

  try {
    const client = new BrokerDaemonClient(rpcAddress)
    const supportedMarkets = await client.infoService.getSupportedMarkets({})
    if (json) {
      logger.info(JSON.stringify(supportedMarkets))
      return
    }
    logger.info(supportedMarkets)
  } catch (e) {
    logger.error(handleError(e))
  }
};

module.exports = supportedMarkets
