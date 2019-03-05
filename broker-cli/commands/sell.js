const BrokerDaemonClient = require('../broker-daemon-client')
const { ENUMS, validations, handleError } = require('../utils')
const { RPC_ADDRESS_HELP_STRING, MARKET_NAME_HELP_STRING } = require('../utils/strings')

const { ORDER_TYPES, TIME_IN_FORCE } = ENUMS

/**
 * sparkswap sell
 *
 * ex: `sparkswap sell 100 --market 'BTC/LTC'
 *
 * @param {Object} args
 * @param {string} args.amount
 * @param {string} args.price
 * @param {Object} opts
 * @param {string} opts.market
 * @param {string} [opts.timeInForce] - opts.timeInForce
 * @param {string} [opts.rpcaddress] - opts.rpcaddress
 * @param {Logger} logger
 */
async function sell (args, opts, logger) {
  const { amount, price } = args
  const { timeInForce, market, rpcAddress } = opts
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
    logger.error(handleError(e))
  }
};

module.exports = (program) => {
  program
    .command('sell', 'Submit an order to sell')
    .argument('<amount>', 'Amount of counter currency to sell', validations.isDecimal)
    .argument('[price]', 'Worst price that this order should be executed at. (If omitted, the market price will be used)', validations.isDecimal)
    .option('--market <marketName>', MARKET_NAME_HELP_STRING, validations.isMarketName, null, true)
    .option('--time-in-force [time-in-force]', 'Time in force policy for this order', Object.keys(TIME_IN_FORCE), 'GTC')
    .option('--rpc-address [rpc-address]', RPC_ADDRESS_HELP_STRING, validations.isHost)
    .action(sell)
}
