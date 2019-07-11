const BrokerDaemonClient = require('../../broker-daemon-client')
const { handleError } = require('../../utils')

/**
 * ex: `sparkswap market supported-markets'
 *
 * @param {object} opts
 * @param {string} opts.rpcaddress
 * @param {Logger} logger
 */
async function supportedMarkets (opts, logger) {
  const { rpcAddress = null } = opts

  try {
    const client = new BrokerDaemonClient(rpcAddress)
    const supportedMarkets = await client.orderBookService.getSupportedMarkets({})
    logger.info(supportedMarkets)
  } catch (e) {
    logger.error(handleError(e))
  }
};

module.exports = supportedMarkets
