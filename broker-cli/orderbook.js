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

async function orderbook (args, opts, logger) {
  const { market, rpcAddress = null } = opts

  if (!market) {
    logger.error('No market specified')
  }

  const request = { market }

  try {
    const watchOrder = await new Broker(rpcAddress).watchMarket(request)
    // UI

    logger.info(`MARKET: ${market.toUpperCase()}`)
    logger.info('                                                                       ')
    logger.info('                ASK                |                BID                ')
    logger.info('      price      |      depth      |      price      |      depth      ')
    logger.info('-----------------------------------------------------------------------')

    watchOrder.on('data', (order) => {
      const { baseAmount, counterAmount, side } = order

      if (side === 'ASK') {
        logger.info(`      ${baseAmount}      |    ${counterAmount}      |                 |                 `)
      } else {
        logger.info(`                 |                 |      ${baseAmount}      |      ${counterAmount}    `)
      }
    })

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
