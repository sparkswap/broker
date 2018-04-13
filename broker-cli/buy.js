const { createOrder } = require('./orders');
const { ENUMS } = require('./utils');

const { ORDER_TYPES } = ENUMS;

async function createBuy(args, opts, logger) {
  return createOrder(args, opts, logger, ORDER_TYPE);
}

module.exports = createBuy;
