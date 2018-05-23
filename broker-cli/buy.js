const BrokerDaemonClient = require('./broker-daemon-client')
const { ENUMS, validations } = require('./utils')

const { ORDER_TYPES, TIME_IN_FORCE } = ENUMS

/**
 * kcli buy
 *
 * ex: `kcli buy 10 100 --market 'BTC/LTC'
 * ex: `kcli buy 10 100 --market 'BTC/LTC' --timeinforce GTC --rpc-address localhost:10009`
 *
 * @param {Object} args
 * @param {String} args.amount
 * @param {String} args.price
 * @param {Object} opts
 * @param {String} opts.market
 * @param {String} [timeinforce] opts.timeinforce
 * @param {String} [rpcaddress] opts.rpcaddress
 * @param {Logger} logger
 */
async function buy (args, opts, logger) {
  const { amount, price } = args
  const { timeInForce, market, rpcAddress = null } = opts
  const side = ORDER_TYPES.BID

  const request = {
    amount,
    price,
    timeInForce,
    market,
    side
  }

  try {
    const orderResult = await new BrokerDaemonClient(rpcAddress).createOrder(request)
    logger.info(orderResult)
  } catch (e) {
    logger.error(e.toString())
  }
};

module.exports = (program) => {
  program
    .command('buy', 'Submit an order to buy.')
    .argument('<amount>', 'Amount of base currency to buy.', validations.isPrice)
    .argument('[price]', 'Worst price that this order should be executed at. (If omitted, the market price will be used)', validations.isPrice)
    .option('--market <marketName>', 'Relevant market name', validations.isMarketName, null, true)
    .option('-t, --time-in-force', `Time in force policy for this order. Available Options: ${Object.values(TIME_IN_FORCE).join(', ')}`, Object.values(TIME_IN_FORCE), TIME_IN_FORCE.GTC)
    .option('--rpc-address', 'Location of the RPC server to use.', validations.isHost)
    .action(buy)
}
