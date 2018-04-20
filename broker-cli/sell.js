/**
 * kcli sell
 *
 * @param amount - required
 * @param price - optional
 * @param options
 * @option market - required
 * @option timeinforce - optional
 * @option rpcaddress - optional
 */

const Broker = require('./broker');
const { ENUMS } = require('./utils');

const { ORDER_TYPES } = ENUMS;

async function sell(args, opts, logger) {
  const { amount, price } = args;
  const { timeinforce, market, rpcAddress = null } = opts;
  const side = ORDER_TYPES.SELL;

  const request = {
    amount,
    price,
    timeinforce,
    market,
    side,
  };

  try {
    const orderResult = await new Broker(rpcAddress).createOrder(request);
    logger.info(orderResult);
  } catch(e) {
    logger.error(e.toString());
  }
};

module.exports = (program) => {
  program
    .command('sell', 'Submit an order to sell.')
    .argument('<amount>', 'Amount of base currency to buy.', program.INT)
    .argument('[price]', 'Worst price that this order should be executed at. (If omitted, the market price will be used)', /^[0-9]{1,20}(\.[0-9]{1,20})?$/)
    .option('--market <marketName>', 'Relevant market name', /^[A-Z]{2,5}\/[A-Z]{2,5}$/, undefined, true)
    .option('-t, --timeinforce', 'Time in force policy for this order.', /^PO|FOK|IOC|GTC$/, 'GTC')
    .option('--rpc-address', 'Location of the RPC server to use.', /^.+(:[0-9]*)?$/)
    .action(sell);
};
