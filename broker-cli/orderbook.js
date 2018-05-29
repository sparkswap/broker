const BrokerDaemonClient = require('./broker-daemon-client')
const { validations } = require('./utils')
const bigInt = require('big-integer')
require('colors')

/**
 * Prints log statements for a psuedo UI for the orderbook
 *
 * TODO: Use a util like clui/smart-table to represent columns/rows
 * @param {String} market
 * @param {Array.<{price: price, depth: depth>}} asks with price and depth
 * @param {Array.<{price: price, depth: depth>}} bids with price and depth

 * @returns {Void}
 */
function createUI (market, asks, bids) {
  console.clear()

  const ui = []

  ui.push('')
  ui.push(String(`Market: ${market.toUpperCase()}`).bold.white)
  ui.push('')
  ui.push(['                ', String('ASK').underline.gray, String('                |                ').gray, String('BID').underline.gray, '                '].join(''))
  ui.push(String('      price      |      depth      |      price      |      depth      ').gray)
  ui.push(String('-----------------------------------------------------------------------').gray)

  let rows = Math.max(asks.length, bids.length)

  if (rows === 0) {
    ui.push(String('                             NO OPEN ORDERS                            ').white)
  }

  let asksAndBids = [asks, bids]
  let orderColors = ['red', 'green']

  for (var i = 0; i < rows; i++) {
    let row = ['', '']
    // TODO: collapse orders at the same price point into a single line
    asksAndBids.forEach((orders, index) => {
      if (orders[i]) {
        // TODO: pull the 8 out of here and make it per-currency configuration
        // TODO: make display of amounts consistent with inputs (buys, prices, etc)
        let price = String(` ${orders[i].price.toJSNumber().toFixed(8)} `)
        let depth = String(` ${orders[i].depth.toJSNumber().toFixed(8)} `)

        row[index] = [price, depth].map((field, j) => {
          while (field.length < 17) {
            field = ` ${field}`
          }

          return j ? field.white : field[orderColors[index]]
        }).join(String('|').gray)
      } else {
        row[index] = [Array(17).fill(' ').join(''), Array(17).fill(' ').join('')].join(String('|').gray)
      }

      while (row[index].length < 17) {
        row[index] = ` ${row[index]}`
      }
    })
    ui.push(row.join(String('|').gray))
  }

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
async function orderbook (args, opts, logger) {
  const { market, rpcAddress = null } = opts
  const request = { market }

  try {
    const brokerDaemonClient = new BrokerDaemonClient(rpcAddress)
    const watchOrder = await brokerDaemonClient.watchMarket(request)
    // TODO: We should save orders to an internal DB or figure out a way to store
    // this info instead of in memory?
    // (this probably needs to be done in the daemon itself)
    const bids = new Map()
    const asks = new Map()

    // Lets initialize the view AND just to be sure, we will clear the view
    console.clear()
    createUI(market, [], [])

    watchOrder.on('data', (order) => {
      const { orderId, baseAmount, counterAmount, side } = order.marketEvent
      const { type } = order
      if (type === brokerDaemonClient.proto.WatchMarketResponse.EventType.DELETE) {
        asks.delete(orderId)
        bids.delete(orderId)
      } else {
        if (side === 'ASK') {
          asks.set(orderId, { counterAmount: bigInt(counterAmount), baseAmount: bigInt(baseAmount) })
        } else {
          bids.set(orderId, { counterAmount: bigInt(counterAmount), baseAmount: bigInt(baseAmount) })
        }
      }

      let transformedAsks = Array.from(asks.values()).map(ask => { return calculatePriceandDepth(ask) })
      let transformedBids = Array.from(bids.values()).map(bid => { return calculatePriceandDepth(bid) })
      let sortedAsks = transformedAsks.sort(function (a, b) { return (a.price > b.price) ? 1 : ((b.price > a.price) ? -1 : 0) })
      let sortedBids = transformedBids.sort(function (a, b) { return (a.price < b.price) ? 1 : ((b.price < a.price) ? -1 : 0) })
      console.clear()
      createUI(market, sortedAsks, sortedBids)
    })

    watchOrder.on('cancelled', () => logger.info('Stream was cancelled by the server'))
    watchOrder.on('end', () => logger.info('End of stream'))
  } catch (e) {
    logger.error(e.toString())
  }
};

/**
 * Takes in an order object with counterAmount and baseAmount and outputs new object with
 * price and depth
 *
 * @param {Object} order with counter amount and base amount
 * @returns {Object} order with price and depth
 */

function calculatePriceandDepth (order) {
  let price = (order.counterAmount.divide(order.baseAmount))
  let depth = (order.baseAmount * 1e-8)
  return {price, depth}
}

module.exports = (program) => {
  program
    .command('orderbook', 'View the order book for a specific market.')
    .option('--market <marketName>', 'Relevant market name', validations.isMarketName, null, true)
    .option('--rpc-address <server>', 'Location of the RPC server to use.', validations.isHost)
    .action(orderbook)
}
