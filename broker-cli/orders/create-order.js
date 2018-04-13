const broker = require('../broker');

/**
 * An event handler for `kcli buy [options]` and `kcli sell [options]
 *
 * @author kinesis
 * @param {Object} args from CLI
 * @param {Object} opts from CLI
 * @param {Logger} logger
 */
async function createOrder(args, opts, logger, side) {
  const { amount, price } = args;
  const { timeinforce, market, rpcAddress = null } = opts;

  const request = {
    amount,
    price,
    timeinforce,
    market,
    side,
  };

  try {
    const orderResult = await new broker(rpcAddress).createOrder(request);
    logger.info(orderResult);
  } catch(e) {
    logger.error(e.toString());
  }
};

module.exports = createOrder;
