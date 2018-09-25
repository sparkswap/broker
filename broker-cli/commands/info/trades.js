const BrokerDaemonClient = require('../../broker-daemon-client')
const { handleError } = require('../../utils')

/**
 *
 * ex: `sparkswap info trades'
 *
 * @param {Object} args
 * @param {String} args.since timestamp for lowerbound of records
 * @param {Integer} args.limit number of records to retrieve
 * @param {Object} opts
 * @param {String} [rpcaddress] opts.rpcaddress
 * @param {String} market opts.rpcaddress
 * @param {Logger} logger
 */
async function trades (args, opts, logger) {
  const { since, limit } = args
  const { market, rpcAddress = null } = opts

  try {
    const client = new BrokerDaemonClient(rpcAddress)
    const trades = await client.infoService.getTrades({since, limit, market})
    logger.info(trades)
  } catch (e) {
    logger.error(handleError(e))
  }
};

module.exports = trades
