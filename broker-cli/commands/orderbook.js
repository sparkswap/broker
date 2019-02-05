const {
  version: BROKER_VERSION
} = require('../package.json')
const BrokerDaemonClient = require('../broker-daemon-client')
const { validations, Big, handleError } = require('../utils')
const { RPC_ADDRESS_HELP_STRING, MARKET_NAME_HELP_STRING } = require('../utils/strings')
const Table = require('cli-table2')
const size = require('window-size')
require('colors')

const EVENT_TYPES = Object.freeze({
  ADD: 'ADD', DELETE: 'DELETE'
})

/**
 * Prints log statements for a psuedo UI for the OrderBook
 *
 * @todo Use a util like cli/smart-table to represent columns/rows
 * @param {string} market
 * @param {Array<Object>} asks - an object with price and depth
 * @param {Array<Object>} bids - an object with price and depth
 */
function createUI (market, asks, bids) {
  console.clear()
  const baseCurrencySymbol = market.split('/')[0].toUpperCase()
  const windowWidth = size.get().width
  const { mainTableWidth, innerTableWidth } = calculateTableWidths(windowWidth)
  const table = new Table({
    head: ['ASKS', 'BIDS'],
    style: { head: ['gray'] },
    colWidths: [mainTableWidth, mainTableWidth]
  })

  // The extensive options are required because the default for cli-table is to have
  // borders between every row and column.
  const innerTableOptions = {
    head: ['Price', `Depth (${baseCurrencySymbol})`],
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

  let leftHeader = `Market: ${market.toUpperCase()}`
  let rightHeader = 'Ϟ SparkSwap Broker'
  let rightSubHeader = `v${BROKER_VERSION}`
  let rightSubSubHeader = 'http://sparkswap.com'

  ui.push('')
  ui.push(' ' + leftHeader.bold.white + Array(windowWidth - 1 - leftHeader.length - rightHeader.length).join(' ') + rightHeader.bold.cyan)
  ui.push(' ' + Array(windowWidth - 1 - rightSubHeader.length).join(' ') + rightSubHeader.gray)
  ui.push(' ' + Array(windowWidth - 1 - rightSubSubHeader.length).join(' ') + rightSubSubHeader.underline.gray)
  ui.push('')

  // TODO: collapse orders at the same price point into a single line

  asks.forEach((ask) => {
    // TODO: make display of amounts consistent with inputs (buys, prices, etc)
    let price = String(` ${ask.price} `)
    let depth = String(` ${ask.amount} `)
    askTable.push([price.red, depth.white])
  })

  bids.forEach((bid) => {
    // TODO: make display of amounts consistent with inputs (buys, prices, etc)
    let price = String(` ${bid.price} `)
    let depth = String(` ${bid.amount} `)
    bidTable.push([price.green, depth.white])
  })

  table.push([askTable.toString(), bidTable.toString()])

  ui.push(table.toString())
  console.log(ui.join('\n') + '\n')
}

/**
 * sparkswap orderbook
 *
 * ex: `sparkswap orderbook --market 'BTC/LTC'
 *
 * @param {Object} args
 * @param {Object} opts
 * @param {string} opts.market
 * @param {string} [rpcaddress] - opts.rpcaddress
 * @param {Logger} logger
 */
async function orderbook (args, opts, logger) {
  const { market, rpcAddress } = opts
  const request = { market }

  try {
    const brokerDaemonClient = new BrokerDaemonClient(rpcAddress)
    const call = brokerDaemonClient.orderBookService.watchMarket(request)
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

    call.on('data', (order) => {
      const { orderId, side, price, amount } = order.marketEvent
      const { type } = order
      if (type === EVENT_TYPES.DELETE) {
        asks.delete(orderId)
        bids.delete(orderId)
      } else {
        if (side === 'ASK') {
          asks.set(orderId, { price, amount })
        } else {
          bids.set(orderId, { price, amount })
        }
      }

      sortedAsks = Array.from(asks.values()).sort(function (a, b) { return (Big(a.price).cmp(b.price)) })
      sortedBids = Array.from(bids.values()).sort(function (a, b) { return (Big(b.price).cmp(a.price)) })
      console.clear()
      createUI(market, sortedAsks, sortedBids)
    })

    process.stdout.on('resize', function () {
      createUI(market, sortedAsks, sortedBids)
    })

    call.on('cancelled', () => logger.info('Stream was cancelled by the server'))
    call.on('end', () => logger.info('End of stream'))
    call.on('error', (e) => logger.error(handleError(e)))
  } catch (e) {
    logger.error(handleError(e))
  }
};

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

  return { mainTableWidth, innerTableWidth }
}

module.exports = (program) => {
  program
    .command('orderbook', 'View the order book for a specific market')
    .option('--market <marketName>', MARKET_NAME_HELP_STRING, validations.isMarketName, null, true)
    .option('--rpc-address [rpc-address]', RPC_ADDRESS_HELP_STRING, validations.isHost)
    .action(orderbook)
}
