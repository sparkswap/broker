/**
 * kcli buy
 *
 * ex: `kcli buy 10 100 --market 'BTC/LTC' --timeinforce GTC --rpc-address localhost:10009`
 *
 * @param amount - required
 * @param price - optional
 * @param options
 * @option market - required
 * @option timeinforce - optional
 * @option rpcaddress - optional
 */

const Broker = require('./broker')

function createUI(market) {
  console.log(`MARKET: ${market.toUpperCase()}`)
  console.log('                                                                       ')
  console.log('                ASK                |                BID                ')
  console.log('      price      |      depth      |      price      |      depth      ')
  console.log('-----------------------------------------------------------------------')
}

async function orderbook (args, opts, logger) {
  const { market, rpcAddress = null } = opts

  if (!market) {
    logger.error('No market specified')
  }

  const request = { market }

  try {
    const watchOrder = await new Broker(rpcAddress).watchMarket(request)

    // TODO: We should save orders to an internal DB or figure out a way to store
    // this info instead of in memory?
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
    .option('--market <marketName>', 'Relevant market name', /^[A-Z]{2,5}\/[A-Z]{2,5}$/, null, true)
    .option('--rpc-address <server>', 'Location of the RPC server to use.', /^.+(:[0-9]*)?$/)
    .action(orderbook)
}
