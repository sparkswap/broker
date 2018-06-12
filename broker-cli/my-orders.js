const BrokerDaemonClient = require('./broker-daemon-client')
const { validations } = require('./utils')
const Table = require('cli-table')
require('colors')

/**
 * Prints table of the users orders
 * @param {String} market
 * @param {Array.<{blockOrderId, side, amount, price, timeInForce, status>}}

 * @returns {Void}
 */
function createUI (market, orders) {
  const orderTable = new Table({
    head: ['Order ID', 'Side', 'Amount', 'Limit Price', 'Time', 'Status'],
    colWidths: [45, 7, 18, 18, 6, 10],
    style: { head: ['gray'] }
  })

  const ui = []

  ui.push('')
  ui.push(String(`Orders: ${market.toUpperCase()}`).bold.white)
  ui.push('')

  orders.forEach((order) => {
    orderTable.push([order.blockOrderId, order.side, order.amount, order.price, order.timeInForce, order.status])
  })

  ui.push(orderTable.toString())
  console.log(ui.join('\n') + '\n')
}

/**
 * kcli orderbook
 *
 * ex: `kcli orderbook --market 'BTC/LTC'
 *
 * @param {Object} args
 * @param {Object} opts
 * @param {String} opts.market
 * @param {String} [rpcaddress] opts.rpcaddress
 * @param {Logger} logger
 */
async function myOrders (args, opts, logger) {
  const { market, rpcAddress = null } = opts
  const request = { market }
  try {
    const brokerDaemonClient = new BrokerDaemonClient(rpcAddress)
    const orders = await brokerDaemonClient.orderService.getBlockOrders(request)
    createUI(market, orders.blockOrders)
  } catch (e) {
    logger.error(e)
  }
};

module.exports = (program) => {
  program
    .command('my-orders', 'View your orders.')
    .option('--market <marketName>', 'Relevant market name', validations.isMarketName, null, true)
    .option('--rpc-address <server>', 'Location of the RPC server to use.', validations.isHost)
    .action(myOrders)
}
