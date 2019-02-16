const BrokerDaemonClient = require('../../broker-daemon-client')
const { handleError, askQuestion } = require('../../utils')

/**
 * @constant
 * @type {Array<string>}
 * @default
 */
const ACCEPTED_ANSWERS = Object.freeze(['y', 'yes'])

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

  const answer = await askQuestion(`Are you sure you want to cancel all your orders on the ${market} market? (Y/N)`)
  if (!ACCEPTED_ANSWERS.includes(answer.toLowerCase())) return

  try {
    const client = new BrokerDaemonClient(rpcAddress)
    const {
      cancelledOrders = [],
      failedToCancelOrders = []
    } = await client.orderService.cancelAllBlockOrders(request)

    var errorMessage = `Succesfully cancelled ${cancelledOrders.length} orders on ${market} market.`
    if (failedToCancelOrders.length) {
      errorMessage += `\nUnable to cancel ${failedToCancelOrders.length} orders on ${market} market.` +
      ' Check your Broker Daemon logs (`docker-compose logs -f sparkswapd`) for more information.'
    }

    logger.info(errorMessage)
  } catch (e) {
    logger.error(handleError(e))
  }
};

module.exports = cancelAll
