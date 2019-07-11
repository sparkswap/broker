const BrokerDaemonClient = require('../../broker-daemon-client')
const { handleError } = require('../../utils')

/**
 * ex: `sparkswap market trades'
 *
 * @param {object} args
 * @param {string} args.since - timestamp for lower bound of records, '2018-09-21T10:58:58.0131174Z'
 * @param {number} args.limit - number of records to retrieve
 * @param {object} opts
 * @param {string} opts.rpcAddress
 * @param {string} opts.market
 * @param {Logger} logger
 */
async function trades (args, opts, logger) {
  const { since, limit } = args
  const { market, rpcAddress } = opts

  try {
    const client = new BrokerDaemonClient(rpcAddress)
    const trades = await client.orderBookService.getTrades({ since, limit, market })
    logger.info(trades)
  } catch (e) {
    logger.error(handleError(e))
  }
};

module.exports = trades
