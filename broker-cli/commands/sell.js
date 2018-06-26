const BrokerDaemonClient = require('../broker-daemon-client')
const { ENUMS, validations } = require('../utils')

const { ORDER_TYPES, TIME_IN_FORCE } = ENUMS

/**
 * kcli sell
 *
 * ex: `kcli sell 100 --market 'BTC/LTC'
 *
 * @param {Object} args
 * @param {String} args.amount
 * @param {Object} opts
 * @param {String} opts.market
 * @param {String} [timeInForce] opts.timeInForce
 * @param {String} [rpcaddress] opts.rpcaddress
 * @param {Logger} logger
 */
async function sell (args, opts, logger) {
  const { amount, price } = args
  const { timeInForce, market, rpcAddress = null } = opts
  const side = ORDER_TYPES.ASK

  const request = {
    amount,
    timeInForce,
    market,
    side
  }

  if (price) {
    request.limitPrice = price
  } else {
    request.isMarketOrder = true
  }

  try {
    // TODO: Figure out where this actually goes. Do we want to create an order
    // or do we use the fill functionality?
    const client = new BrokerDaemonClient(rpcAddress)
    const blockOrderResult = await client.orderService.createBlockOrder(request)

    // TODO: send a friendly message the logger. The current functionality will simple
    // return the object from the broker.proto file
    logger.info(blockOrderResult)
  } catch (e) {
    logger.error(e)
  }
};

module.exports = (program) => {
  program
    .command('sell', 'Submit an order to sell.')
    .argument('<amount>', 'Amount of counter currency to sell.', validations.isDecimal)
    .argument('[price]', 'Worst price that this order should be executed at. (If omitted, the market price will be used)', validations.isDecimal)
    .option('--market <marketName>', 'Relevant market name', validations.isMarketName, null, true)
    .option('-t, --time-in-force', 'Time in force policy for this order.', Object.keys(TIME_IN_FORCE), 'GTC')
    .option('--rpc-address', 'Location of the RPC server to use.', validations.isHost)
    .action(sell)
}
