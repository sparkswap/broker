const BrokerDaemonClient = require('./broker-daemon-client')
const { validations } = require('./utils')
const bigInt = require('big-integer')
const Table = require('cli-table')
const size = require('window-size')
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
  const { mainTableWidth, innerTableWidth } = calculateTableWidths(size.get().width)
  const table = new Table({
    head: ['ASKS', 'BIDS'],
    style: { head: ['gray'] },
    colWidths: [mainTableWidth, mainTableWidth]
  })

  // The extensive options are required because the default for cli-table is to have
  // borders between every row and column.
  const innerTableOptions = {
    head: ['Price', 'Depth'],
    style: { head: ['gray'] },
    colWidths: [innerTableWidth, innerTableWidth],
    chars: {
      'top': '',
      'top-mid': '',
      'top-left': '',
      'top-right': '',
      'bottom': '',
      'bottom-mid': '',
      'bottom-left': '',
      'bottom-right': '',
      'left': '',
      'left-mid': '',
      'mid': '',
      'mid-mid': '',
      'right': '',
      'right-mid': '',
      'middle': ''
    }
  }
  const askTable = new Table(innerTableOptions)
  const bidTable = new Table(innerTableOptions)

  const ui = []

  ui.push('')
  ui.push(String(`Market: ${market.toUpperCase()}`).bold.white)
  ui.push('')

  table.push([askTable, bidTable])

  // TODO: collapse orders at the same price point into a single line

  asks.forEach((ask) => {
    // TODO: make display of amounts consistent with inputs (buys, prices, etc)
    let price = String(` ${ask.price} `)
    let depth = String(` ${ask.depth} `)
    askTable.push([price.red, depth.white])
  })

  bids.forEach((bid) => {
    // TODO: make display of amounts consistent with inputs (buys, prices, etc)
    let price = String(` ${bid.price} `)
    let depth = String(` ${bid.depth} `)
    bidTable.push([price.green, depth.white])
  })

  ui.push(table.toString())
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
    let sortedAsks = []
    let sortedBids = []

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
      sortedAsks = transformedAsks.sort(function (a, b) { return (a.price.compare(b.price)) })
      sortedBids = transformedBids.sort(function (a, b) { return (b.price.compare(a.price)) })
      console.clear()
      createUI(market, sortedAsks, sortedBids)
    })

    process.stdout.on('resize', function () {
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
  return {price, depth: order.baseAmount}
}

/**
 * Takes in an window width and returns object with appropriate table widths
 * for the orderbook
 * @param {Integer} window width
 * @returns {Object} with mainTableWidth and innerTableWidth
 */

function calculateTableWidths (windowWidth) {
  const borderOffset = 4
  const numTables = 2
  const mainTableWidth = Math.round((windowWidth - borderOffset) / numTables)
  const innerTableWidth = Math.round((mainTableWidth - borderOffset) / numTables)

  return {mainTableWidth, innerTableWidth}
}

module.exports = (program) => {
  program
    .command('orderbook', 'View the order book for a specific market.')
    .option('--market <marketName>', 'Relevant market name', validations.isMarketName, null, true)
    .option('--rpc-address <server>', 'Location of the RPC server to use.', validations.isHost)
    .action(orderbook)
}
