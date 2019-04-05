const {
  version: BROKER_VERSION
} = require('../package.json')
const BrokerDaemonClient = require('../broker-daemon-client')
const { validations, Big, handleError } = require('../utils')
const { RPC_ADDRESS_HELP_STRING, MARKET_NAME_HELP_STRING } = require('../utils/strings')
const Table = require('cli-table2')
const size = require('window-size')
require('colors')

/**
 * @constant
 * @type {Object}
 * @default
 */
const EVENT_TYPES = Object.freeze({
  ADD: 'ADD', DELETE: 'DELETE'
})

/**
 * @constant
 * @type {Object}
 */
const FORMAT_TYPES = Object.freeze({
  ASK: 'ASK',
  BID: 'BID',
  DEPTH: 'DEPTH'
})

/**
 * Used for defining the column width for `Price` and `Depth (currency)`.
 * @constant
 * @type {number}
 */
const COLUMN_WIDTHS = 30

/**
 * Number of lines that aren't used for displaying `Price` and `Depth` from
 * a Bid or Ask. Can be empty spaces, marketing, borders, etc.
 *
 * This is used for calculating how many orders can be displayed in the UI.
 *
 * @constant
 * @type {number}
 */
const NON_MARKET_INFO = 12

/**
 * Prints log statements for a psuedo UI for the OrderBook
 *
 * @todo Use a util like cli/smart-table to represent columns/rows
 * @param {string} market
 * @param {Array<Object>} asks - an array of objects with price and depth
 * @param {Array<Object>} bids - an array of object with price and depth
 */
function createUI (market, asks, bids) {
  console.clear()
  const windowHeight = size.get().height

  // Fill as many orders as the screen allows less other info displayed
  const maxLengthPerSide = Math.floor((windowHeight - NON_MARKET_INFO) / 2)
  const baseCurrencySymbol = market.split('/')[0].toUpperCase()

  const parentTable = new Table({
    head: [],
    chars: {
      'top-mid': '',
      'bottom-mid': '',
      'left-mid': '',
      'mid': '',
      'mid-mid': '',
      'right-mid': '',
      'middle': ''
    },
    style: {
      'padding-left': 0,
      'padding-right': 0
    }
  })

  // Used for `chars` property when instantiating a new Table with no borders
  const noBorders = {
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

  const tableHeaders = new Table({
    head: [],
    chars: noBorders,
    colWidths: [COLUMN_WIDTHS, COLUMN_WIDTHS],
    style: {
      'padding-left': 0,
      'padding-right': 0
    }
  })

  tableHeaders.push([{ hAlign: 'center', content: 'Price' }, { hAlign: 'center', content: `Depth (${baseCurrencySymbol})` }])

  const asksTable = new Table({
    head: [],
    chars: noBorders,
    colWidths: [COLUMN_WIDTHS, COLUMN_WIDTHS],
    style: {
      'padding-left': 0,
      'padding-right': 0
    }
  })

  addOrdersToTable(asks, asksTable, FORMAT_TYPES.ASK, maxLengthPerSide)

  const bidsTable = new Table({
    head: [],
    chars: noBorders,
    colWidths: [COLUMN_WIDTHS, COLUMN_WIDTHS],
    style: {
      'padding-left': 0,
      'padding-right': 0
    }
  })

  // Create empty row for symmetric spacing around horizontal line separator
  bidsTable.push([' ', ' '])

  addOrdersToTable(bids, bidsTable, FORMAT_TYPES.BID, maxLengthPerSide)

  // Used for creating border between bids / asks
  const gapTable = new Table({
    head: [],
    rowHeights: [1],
    // Only need bottom border, so remove all other characters
    chars: {
      'top': '',
      'top-mid': '',
      'top-left': '',
      'top-right': '',
      'bottom': String.fromCharCode(9472), // Default bottom border in cli-table2; provided for clarity
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
    },
    colWidths: [COLUMN_WIDTHS, COLUMN_WIDTHS],
    style: {
      'padding-left': 0,
      'padding-right': 0
    }
  })

  gapTable.push([' ', ' '])

  const ui = []

  let leftHeader = `Market: ${market.toUpperCase()}`
  let rightHeader = 'Ϟ SparkSwap Broker'
  let rightSubHeader = `v${BROKER_VERSION}`
  let rightSubSubHeader = 'http://sparkswap.com'

  ui.push('')
  ui.push(' ' + leftHeader.bold.white + Array((COLUMN_WIDTHS * 2) - leftHeader.length - rightHeader.length).join(' ') + rightHeader.bold.cyan)
  ui.push(' ' + Array((COLUMN_WIDTHS * 2) - rightSubHeader.length).join(' ') + rightSubHeader.gray)
  ui.push(' ' + Array((COLUMN_WIDTHS * 2) - rightSubSubHeader.length).join(' ') + rightSubSubHeader.underline.gray)
  ui.push('')
  parentTable.push([tableHeaders.toString()])
  parentTable.push([asksTable.toString()])
  parentTable.push([gapTable.toString()])
  parentTable.push([bidsTable.toString()])
  ui.push(parentTable.toString())
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
 * @param {string} opts.rpcaddress
 * @param {Logger} logger
 * @returns {void}
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
 * Takes a number formatted as a string and applies coloring so all digits following
 * the last significant digit are grayed out.
 *
 * @param {string} text
 * @param {string} type - represents whether to format as a bid, ask, or depth
 * @returns {string}
 */
function formatText (text, type) {
  const firstNonSigZero = findFirstNonSigZero(text)
  const needsGrayColoring = firstNonSigZero > -1

  let formatted = ''
  if (needsGrayColoring) {
    for (let i = 0; i < text.length; i++) {
      if (i < firstNonSigZero) {
        formatted += addColoring(text.charAt(i), type)
      } else {
        formatted += text.charAt(i).gray
      }
    }
  } else {
    formatted = addColoring(text, type)
  }

  return formatted
}

/**
 * Adds coloring based on the type of text (Bid, Aks, Depth).
 *
 * @param {string} text
 * @param {string} type - represents whether to format as a bid, ask, or depth
 * @returns {string}
 */
function addColoring (text, type) {
  switch (type) {
    case FORMAT_TYPES.BID:
      return text.green
    case FORMAT_TYPES.ASK:
      return text.red
    case FORMAT_TYPES.DEPTH:
      return text.white
  }
}

/**
 * Finds the index of the first non significant zero. Returns index, or -1 if none.
 *
 * @param {string} text
 * @returns {number} Index of the first non significant zero
 */
function findFirstNonSigZero (text) {
  let firstNonSigZero = -1
  for (let i = 0; i < text.length; i++) {
    const remaining = [...text].slice(i)
    const allZeroesRemaining = remaining.every(char => { return char === '0' || char === '.' })

    if (allZeroesRemaining) {
      firstNonSigZero = i
      break
    }
  }

  return firstNonSigZero
}

/**
 * Takes an array of order objects and adds the formatted orders to the given orders table.
 *
 * @param {Array<Object>} orders - the orders to format, given as an object with price and depth
 * @param {Object} ordersTable - table to add formatted orders to
 * @param {string} type - represents whether to format as bids or asks
 * @param {number} maxLength - maximum number of orders that can be displayed
 * @returns {void}
 */
function addOrdersToTable (orders, ordersTable, type, maxLength) {
  const formattedOrders = []

  for (const [index, order] of orders.entries()) {
    if (index === maxLength) {
      // If there are more orders than can be displayed, we notify the user the amount not displayed
      const ordersNotDisplayed = orders.length - maxLength
      const message = ` ${ordersNotDisplayed} more...`.gray
      formattedOrders.push([{ hAlign: 'left', content: message }, ''])
      break
    }

    const formattedPrice = formatText(order.price, type)
    const formattedDepth = formatText(order.amount, FORMAT_TYPES.DEPTH)
    formattedOrders.push([{ hAlign: 'center', content: formattedPrice }, { hAlign: 'center', content: formattedDepth }])
  }

  if (orders.length < maxLength) {
    // The number of orders don't fill up the provided space. Add empty rows to keep the orderbook consistently spaced
    const emptyRecords = maxLength - orders.length
    for (let i = 0; i < emptyRecords; i++) {
      formattedOrders.push([' ', ' '])
    }
  }

  if (type === FORMAT_TYPES.ASK) {
    // Asks are given as lowest price first, however for the UI we want to display the highest price first
    formattedOrders.reverse().forEach((order) => ordersTable.push(order))
  } else {
    formattedOrders.forEach((order) => ordersTable.push(order))
  }
}

module.exports = (program) => {
  program
    .command('orderbook', 'View the order book for a specific market')
    .option('--market <marketName>', MARKET_NAME_HELP_STRING, validations.isMarketName, null, true)
    .option('--rpc-address [rpc-address]', RPC_ADDRESS_HELP_STRING, validations.isHost)
    .action(orderbook)
}
