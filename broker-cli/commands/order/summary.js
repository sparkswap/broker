const BrokerDaemonClient = require('../../broker-daemon-client')
const Table = require('cli-table')
const { ENUMS: { ORDER_TYPES }, handleError } = require('../../utils')
require('colors')
const size = require('window-size')

/**
 * Prints table of the users orders
 * @param {String} market
 * @param {Array.<{blockOrderId, side, amount, price, timeInForce, status>}}

 * @returns {Void}
 */
function createUI (market, orders) {
  const windowWidth = size.get().width
  const unitWidth = Math.floor(windowWidth / 16)

  const orderTable = new Table({
    head: ['Order ID', 'Side', 'Amount', 'Limit Price', 'Time', 'Status'],
    colWidths: [5 * unitWidth, unitWidth, 3 * unitWidth, 3 * unitWidth, unitWidth, 2 * unitWidth],
    style: { head: ['gray'] }
  })

  const ui = []

  ui.push('')
  ui.push(String(`Orders: ${market.toUpperCase()}`).bold.white)
  ui.push('')

  orders.forEach((order) => {
    const price = order.isMarketOrder ? 'MARKET' : order.limitPrice
    const side = order.side === ORDER_TYPES.BID ? order.side.green : order.side.red
    orderTable.push([order.blockOrderId, side, order.amount, price, order.timeInForce, order.status])
  })

  ui.push(orderTable.toString())
  console.log(ui.join('\n') + '\n')
}

/**
 * sparkswap order summary
 *
 * ex: `sparkswap order summary --market 'BTC/LTC'
 *
 * @param {Object} args
 * @param {Object} opts
 * @param {String} opts.market
 * @param {String} [rpcaddress] opts.rpcaddress
 * @param {Logger} logger
 */
async function summary (args, opts, logger) {
  const { market, rpcAddress = null } = opts
  const request = { market }
  try {
    const brokerDaemonClient = new BrokerDaemonClient(rpcAddress)
    const orders = await brokerDaemonClient.orderService.getBlockOrders(request)
    createUI(market, orders.blockOrders)
  } catch (e) {
    logger.error(handleError(e))
  }
};

module.exports = summary
