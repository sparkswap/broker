const { createOrder } = require('./orders');
const { ENUMS } = require('./utils');

const { ORDER_TYPES } = ENUMS;

async function createSell(args, opts, logger) {
  return createOrder(args, opts, logger, ORDER_TYPES.SELL);
}

module.exports = createSell;
