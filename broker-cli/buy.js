const program = require('caporal');

const { createBuy } = require('./commands');
const { enums: ENUMS } = require('./utils');

// TODO: Rename this thing...
const timeinforce = ENUMS.timeInForceParams;

/**
 *
 */
program
  .command('buy', 'Submit an order to buy.')

  // Required argument
  .argument('<amount>', 'Amount of base currency to buy.', program.INT)

  // Optional argument
  .argument('[price]', 'Worst price that this order should be executed at. (If omitted, the market price will be used)', /^[0-9]{1,20}(\.[0-9]{1,20})?$/)

  // Required options
  .option('--market <marketName>', 'Relevant market name', /^[A-Z]{2,5}\/[A-Z]{2,5}$/, undefined, true)

  // Optional options
  .option('-t, --timeinforce', 'Time in force policy for this order.', /^PO|FOK|IOC|GTC$/, 'GTC')
  .option('--rpc-address', 'Location of the RPC server to use.', /^.+(:[0-9]*)?$/)

  .action(createBuy)
