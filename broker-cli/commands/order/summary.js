const Table = require('cli-table2')
const size = require('window-size')
require('colors')

const {
  ENUMS: {
    ORDER_TYPES
  },
  handleError,
  grpcDeadline
} = require('../../utils')
const BrokerDaemonClient = require('../../broker-daemon-client')

/**
 * Prints table of the users orders
 * @param {string} market
 * @param {Array<Order>} orders
 * @returns {void}
 */
function createUI (market, orders) {
  const windowWidth = size.get().width
  const unitWidth = Math.floor(windowWidth / 16)

  const orderTable = new Table({
    head: ['Order ID', 'Status', 'Side', 'Amount', 'Limit Price', 'Time', 'Created At'],
    colWidths: [2 * unitWidth, unitWidth, unitWidth, 3 * unitWidth, 3 * unitWidth, unitWidth, 3 * unitWidth],
    style: { head: ['gray'] }
  })

  const ui = []

  ui.push('')
  ui.push(String(`Orders: ${market.toUpperCase()}`).bold.white)
  ui.push('')

  orders.forEach((order) => {
    const price = order.isMarketOrder ? 'MARKET' : order.limitPrice
    const side = order.side === ORDER_TYPES.BID ? order.side.green : order.side.red
    const date = new Date(order.datetime).toISOString()
    orderTable.push([order.blockOrderId, order.status, side, order.amount, price, order.timeInForce, date])
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
 * @param {string} opts.market
 * @param {string} opts.rpcaddress
 * @param {Logger} logger
 */
async function summary (args, opts, logger) {
  const { market } = args

  const {
    limit,
    active,
    cancelled,
    completed,
    failed,
    rpcAddress
  } = opts

  const request = {
    market,
    options: {
      limit,
      active,
      cancelled,
      completed,
      failed
    }
  }

  try {
    const brokerDaemonClient = new BrokerDaemonClient(rpcAddress)

    console.log(request)

    // We extend the gRPC deadline of this call because there's a possibility to return
    // a lot of records from the endpoint
    const orders = await brokerDaemonClient.orderService.getBlockOrders(request, { deadline: grpcDeadline(30) })
    createUI(market, orders.blockOrders)
  } catch (e) {
    logger.error(handleError(e))
  }
};

module.exports = summary
