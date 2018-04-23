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

const Broker = require('./broker')

async function sell (args, opts, logger) {
  const { amount } = args
  const { market, rpcAddress = null } = opts

  const request = {
    amount,
    market
  }

  try {
    // This is totally a demo branch thing. fillOrder is not the first step of the
    // fill process
    const fillResult = await new Broker(rpcAddress).createFill(request)
    logger.info(fillResult)
  } catch (e) {
    logger.error(e.toString())
  }
};

module.exports = (program) => {
  program
    .command('sell', 'Submit a sell order.')
    .argument('<amount>', 'Amount of base currency to buy.', program.INT)
    .option('--market <marketName>', 'Relevant market name', /^[A-Z]{2,5}\/[A-Z]{2,5}$/, undefined, true)
    .option('--rpc-address', 'Location of the RPC server to use.', /^.+(:[0-9]*)?$/)
    .action(sell)
}
