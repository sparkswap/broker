const BrokerDaemonClient = require('../broker-daemon-client')
const { ENUMS, validations, handleError } = require('../utils')
const { RPC_ADDRESS_HELP_STRING, MARKET_NAME_HELP_STRING } = require('../utils/strings')

const { ORDER_TYPES, TIME_IN_FORCE } = ENUMS

/**
 * sparkswap buy
 *
 * ex: `sparkswap buy 10 100 --market 'BTC/LTC'
 * ex: `sparkswap buy 10 100 --market 'BTC/LTC' --timeinforce GTC --rpc-address localhost:10009`
 *
 * @param {Object} args
 * @param {string} args.amount
 * @param {string} args.price
 * @param {Object} opts
 * @param {string} opts.market
 * @param {string} [timeinforce] - opts.timeinforce
 * @param {string} [rpcaddress] - opts.rpcaddress
 * @param {Logger} logger
 */
async function buy (args, opts, logger) {
  const { amount, price } = args
  const { timeInForce, market, rpcAddress } = opts
  const side = ORDER_TYPES.BID

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
    const client = new BrokerDaemonClient(rpcAddress)
    const blockOrderResult = await client.orderService.createBlockOrder(request)
    logger.info(blockOrderResult)
  } catch (e) {
    logger.error(handleError(e))
  }
};

module.exports = (program) => {
  program
    .command('buy', 'Submit an order to buy')
    .argument('<amount>', 'Amount of base currency to buy', validations.isDecimal)
    .argument('[price]', 'Worst price at which this order should be executed (If omitted, the market price will be used)', validations.isDecimal)
    .option('--market <marketName>', MARKET_NAME_HELP_STRING, validations.isMarketName, null, true)
    .option('--time-in-force [time-in-force]', `Time in force policy for this order. Available Options: ${Object.values(TIME_IN_FORCE).join(', ')}`, Object.values(TIME_IN_FORCE), TIME_IN_FORCE.GTC)
    .option('--rpc-address [rpc-address]', RPC_ADDRESS_HELP_STRING, validations.isHost)
    .action(buy)
}
