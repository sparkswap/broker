/**
 * Create Order functionality for the Kinesis Daemon
 *
 * @author kinesis
 */

const { GrpcServer } = require('./utils');

/**
 * An event handler for `kcli create-order [options]`
 *
 * Example Params:
 * ownerId: '123455678',
 * payTo: 'ln:12234987',
 * baseSymbol: 'BTC',
 * counterSymbol: 'LTC',
 * baseAmount: '10000',
 * counterAmount: '1000000',
 * side: 'BID',
 *
 * @param {null} _args
 * @param {Object} opts from CLI
 * @param {Logger} _log
 */
async function createOrder(_args, opts, _log) {
  console.log(opts);
  // const {
  //   ownerId,
  //   payTo,
  //   baseSymbol,
  //   counterSymbol,
  //   baseAmount,
  //   counterAmount,
  //   side
  // } = opts;
  try {
    const server = new GrpcServer();
    const orderResult = await server.makerCreateOrder(opts)
  } catch(e) {
    console.error(e);
  }
};

module.exports = createOrder;
