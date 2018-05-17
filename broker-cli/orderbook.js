const BrokerDaemonClient = require('./broker-daemon-client')
const { validations } = require('./utils')

/**
 * Prints log statements for a psuedo UI for the orderbook
 *
 * TODO: Use a util like clui/smart-table to represent columns/rows
 * @param {String} market
 * @returns {Void}
 */
function createUI (market) {
  console.log(`MARKET: ${market.toUpperCase()}`)
  console.log('                                                                       ')
  console.log('                ASK                |                BID                ')
  console.log('      price      |      depth      |      price      |      depth      ')
  console.log('-----------------------------------------------------------------------')
}

/**
 * kcli orderbook
 *
 * ex: `kcli orderbook --market 'BTC/LTC'
 *
 * @param {Object} args
 * @param {Object} opts
 * @param {String} opts.market
 * @param {String} [rpcaddress] opts.rpcaddress
 * @param {Logger} logger
 */
async function orderbook (args, opts, logger) {
  const { market, rpcAddress = null } = opts
  const request = { market }

  try {
    const watchOrder = await new BrokerDaemonClient(rpcAddress).watchMarket(request)

    // TODO: We should save orders to an internal DB or figure out a way to store
    // this info instead of in memory?
    // (this probably needs to be done in the daemon itself)
    const orders = []

    // Lets initialize the view AND just to be sure, we will clear the view
    console.clear()
    createUI(market)

    watchOrder.on('data', (order) => {
      const { orderId, baseAmount, counterAmount, side } = order

      if (side === 'ASK') {
        orders.push({ [orderId]: `      ${baseAmount}      |    ${counterAmount}      |                 |                 ` })
      } else {
        orders.push({ [orderId]: `                 |                 |      ${baseAmount}      |      ${counterAmount}    ` })
      }

      console.clear()
      createUI(market)
      orders.forEach((order) => console.log(Object.values(order)[0]))
    })

    watchOrder.on('cancelled', () => logger.info('Stream was cancelled by the server'))
    watchOrder.on('end', () => logger.info('End of stream'))
  } catch (e) {
    logger.error(e.toString())
  }
};

module.exports = (program) => {
  program
    .command('orderbook', 'View the order book for a specific market.')
    .option('--market <marketName>', 'Relevant market name', validations.isMarketName, null, true)
    .option('--rpc-address <server>', 'Location of the RPC server to use.', validations.isHost)
    .action(orderbook)
}
