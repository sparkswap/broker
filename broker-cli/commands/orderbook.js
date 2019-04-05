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
 * Used for defining the column width for `Price` and `Depth (currency)`
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

  const bidsTable = new Table({
    head: [],
    chars: noBorders,
    colWidths: [COLUMN_WIDTHS, COLUMN_WIDTHS],
    style: {
      'padding-left': 0,
      'padding-right': 0
    }
  })

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

  const displayAsks = (asks) => {
    // Asks are added to the table with highest (worst) price at top, so need to sort
    [...asks].sort((a, b) => {
      return b.price - a.price
    }).forEach((ask) => {
      const formattedPrice = formatText(ask.price, FORMAT_TYPES.ASK)
      const formattedDepth = formatText(ask.amount, FORMAT_TYPES.DEPTH)
      asksTable.push([{ hAlign: 'center', content: formattedPrice }, { hAlign: 'center', content: formattedDepth }])
    })
  }

  if (asks.length <= maxLengthPerSide) {
    // Total asks will fit within screen, so add extra spacing if needed
    const emptyRecords = maxLengthPerSide - asks.length
    for (let i = 0; i < emptyRecords; i++) {
      asksTable.push([' ', ' '])
    }

    displayAsks(asks)
  } else {
    // There are more asks than can be displayed on screen. Display to user how many aren't displayed then add the rest
    const asksNotDisplayed = asks.length - maxLengthPerSide + 1
    if (asksNotDisplayed) {
      const message = ` ${asksNotDisplayed} more...`.gray
      asksTable.push([{ hAlign: 'left', content: message }, ''])
    }

    // Need to subtract 1 from maxLengthPerSide and use this space to display how many remaining asks aren't shown
    const bestAsks = asks.slice(0, maxLengthPerSide - 1)
    displayAsks(bestAsks)
  }

  // Create empty row for symmetric spacing around horizontal line separator
  bidsTable.push([' ', ' '])

  for (const [index, bid] of bids.entries()) {
    // Bids are displayed with highest (best) price at top, so we don't need to sort. Once we hit max length, we end
    // printing and let the user know how many bids remain
    if (index === maxLengthPerSide) {
      const bidsNotDisplayed = bids.length - maxLengthPerSide
      const message = ` ${bidsNotDisplayed} more...`.gray
      bidsTable.push([{ hAlighn: 'left', content: message }, ''])
      break
    }

    const formattedPrice = formatText(bid.price, FORMAT_TYPES.BID)
    const formattedDepth = formatText(bid.amount, FORMAT_TYPES.DEPTH)
    bidsTable.push([{ hAlign: 'center', content: formattedPrice }, { hAlign: 'center', content: formattedDepth }])
  }

  // Add additional spacing at bottom to keep orderbook height symmetric
  if (bids.length < maxLengthPerSide) {
    const emptyRecords = maxLengthPerSide - bids.length
    for (let i = 0; i < emptyRecords; i++) {
      bidsTable.push([' ', ' '])
    }
  }

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

module.exports = (program) => {
  program
    .command('orderbook', 'View the order book for a specific market')
    .option('--market <marketName>', MARKET_NAME_HELP_STRING, validations.isMarketName, null, true)
    .option('--rpc-address [rpc-address]', RPC_ADDRESS_HELP_STRING, validations.isHost)
    .action(orderbook)
}
