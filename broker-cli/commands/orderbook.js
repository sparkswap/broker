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

const FORMAT_TYPES = Object.freeze({
  ASK: 'ASK',
  BID: 'BID',
  DEPTH: 'DEPTH'
})

const COLUMN_WIDTHS = 30

let testAsks = [
  { price: '64.3000000000000000', amount: '0.0000100000000000' },
  { price: '64.3000000000000000', amount: '0.0000100000000000' },
  { price: '64.3000000000000000', amount: '0.0000100000000000' },
  { price: '64.3000000000000000', amount: '0.0000100000000000' },
  { price: '64.3000000000000000', amount: '0.0000100000000000' },
  { price: '64.3000000000000000', amount: '0.0000100000000000' },
  { price: '64.3000000000000000', amount: '0.0000100000000000' },
  { price: '64.3000000000000000', amount: '0.0000100000000000' },
  { price: '64.3000000000000000', amount: '0.0000100000000000' },
  { price: '64.3000000000000000', amount: '0.0000100000000000' },
  { price: '64.3000000000000000', amount: '0.0000100000000000' },
  { price: '600.0000000000000000', amount: '0.0000100000000000' },
  { price: '604.3000000000000000', amount: '0.0000100000000000' }
]

let testBids = [
  { price: '63.3000000000000000', amount: '0.0000100000000000' },
  { price: '63.3000000000000000', amount: '0.0000100000000000' },
  { price: '63.3000000000000000', amount: '0.0000100000000000' },
  { price: '63.3000000000000000', amount: '0.0000100000000000' },
  { price: '63.3000000000000000', amount: '0.0000100000000000' },
  { price: '63.3000000000000000', amount: '0.0000100000000000' },
  { price: '63.3000000000000000', amount: '0.0000100000000000' },
  { price: '63.3000000000000000', amount: '0.0000100000000000' },
  { price: '63.3000000000000000', amount: '0.0000100000000000' },
  { price: '63.3000000000000000', amount: '0.0000100000000000' },
  { price: '63.3000000000000000', amount: '0.0000100000000000' },
  { price: '63.3000000000000000', amount: '0.0000100000000000' },
  { price: '63.3000000000000000', amount: '0.0000100000000000' },
  { price: '63.3000000000000000', amount: '0.0000100000000000' },
  { price: '63.3000000000000000', amount: '0.0000100000000000' },
  { price: '63.3000000000000000', amount: '0.0000100000000000' },
  { price: '63.3000000000000000', amount: '0.0000100000000000' },
  { price: '63.3000000000000000', amount: '0.0000100000000000' },
  { price: '63.3000000000000000', amount: '0.0000100000000000' },
  { price: '63.3000000000000000', amount: '0.0000100000000000' },
  { price: '63.3000000000000000', amount: '0.0000100000000000' },
  { price: '63.3000000000000000', amount: '0.0000100000000000' },
  { price: '63.3000000000000000', amount: '0.0000100000000000' },
  { price: '63.3000000000000000', amount: '0.0000100000000000' },
  { price: '63.3000000000000000', amount: '0.0000100000000000' },
  { price: '63.3000000000000000', amount: '0.0000100000000000' },
  { price: '63.3000000000000000', amount: '0.0000100000000000' },
  { price: '63.3000000000000000', amount: '0.0000100000000000' },
  { price: '63.3000000000000000', amount: '0.0000100000000000' },
  { price: '63.3000000000000000', amount: '0.0000100000000000' },
  { price: '63.3000000000000000', amount: '0.0000100000000000' },
  { price: '63.3000000000000000', amount: '0.0000100000000000' },
  { price: '63.3000000000000000', amount: '0.0000100000000000' },
  { price: '63.3000000000000000', amount: '0.0000100000000000' },
  { price: '63.3000000000000000', amount: '0.0000100000000000' },
  { price: '63.3000000000000000', amount: '0.0000100000000000' },
  { price: '63.3000000000000000', amount: '0.0000100000000000' },
  { price: '63.3000000000000000', amount: '0.0000100000000000' },
  { price: '63.3000000000000000', amount: '0.0000100000000000' },
  { price: '63.3000000000000000', amount: '0.0000100000000000' },
  { price: '63.3000000000000000', amount: '0.0000100000000000' },
  { price: '63.3000000000000000', amount: '0.0000100000000000' },
  { price: '63.3000000000000000', amount: '0.0000100000000000' },
  { price: '63.3000000000000000', amount: '0.0000100000000000' },
  { price: '63.3000000000000000', amount: '0.0000100000000000' },
  { price: '63.3000000000000000', amount: '0.0000100000000000' },
  { price: '63.3000000000000000', amount: '0.0000100000000000' },
  { price: '63.3000000000000000', amount: '0.0000100000000000' },
  { price: '63.3000000000000000', amount: '0.0000100000000000' },
  { price: '63.3000000000000000', amount: '0.0000100000000000' },
  { price: '63.3000000000000000', amount: '0.0000100000000000' },
  { price: '63.3000000000000000', amount: '0.0000100000000000' },
  { price: '63.3000000000000000', amount: '0.0000100000000000' },
  { price: '63.3000000000000000', amount: '0.0000100000000000' },
  { price: '63.3000000000000000', amount: '0.0000100000000000' },
  { price: '63.3000000000000000', amount: '0.0000100000000000' },
  { price: '63.3000000000000000', amount: '0.0000100000000000' },
  { price: '63.3000000000000000', amount: '0.0000100000000000' },
  { price: '63.3000000000000000', amount: '0.0000100000000000' },
  { price: '63.3000000000000000', amount: '0.0000100000000000' },
  { price: '63.3000000000000000', amount: '0.0000100000000000' },
  { price: '63.3000000000000000', amount: '0.0000100000000000' },
  { price: '63.3000000000000000', amount: '0.0000100000000000' },
  { price: '63.3000000000000000', amount: '0.0000100000000000' },
  { price: '63.3000000000000000', amount: '0.0000100000000000' },
  { price: '63.3000000000000000', amount: '0.0000100000000000' },
  { price: '63.3000000000000000', amount: '0.0000100000000000' }
]

/**
 * Prints log statements for a psuedo UI for the OrderBook
 *
 * @todo Use a util like cli/smart-table to represent columns/rows
 * @param {string} market
 * @param {Array<Object>} asks - an object with price and depth
 * @param {Array<Object>} bids - an object with price and depth
 */
function createUI (market, asks, bids) {
  asks = testAsks
  bids = testBids
  console.clear()
  const windowHeight = size.get().height
  // Fill as many orders as the screen allows, accounting for line spacing
  const maxLengthPerSide = Math.floor((windowHeight - 12) / 2)
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

  const tableHeaders = new Table({
    head: [],
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
    },
    colWidths: [COLUMN_WIDTHS, COLUMN_WIDTHS],
    style: {
      'padding-left': 0,
      'padding-right': 0
    }
  })

  tableHeaders.push([{ hAlign: 'center', content: 'Price' }, { hAlign: 'center', content: `Depth (${baseCurrencySymbol})` }])

  const asksTable = new Table({
    head: [],
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
    },
    colWidths: [COLUMN_WIDTHS, COLUMN_WIDTHS],
    style: {
      'padding-left': 0,
      'padding-right': 0
    }
  })

  // Create empty space if records are less than max, so alignment of orderbook is the same as orders are
  // added and removed
  if (asks.length < maxLengthPerSide) {
    const emptyRecords = maxLengthPerSide - asks.length
    for (let i = 0; i < emptyRecords; i++) {
      asksTable.push([' ', ' '])
    }
  } else {
    asks.splice(maxLengthPerSide)
  }

  asks.sort((a, b) => {
    return b.price - a.price
  }).forEach((ask) => {
    const formattedPrice = formatText(ask.price, FORMAT_TYPES.ASK)
    const formattedDepth = formatText(ask.amount, FORMAT_TYPES.DEPTH)
    asksTable.push([{ hAlign: 'center', content: formattedPrice }, { hAlign: 'center', content: formattedDepth }])
  })

  const bidsTable = new Table({
    head: [],
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
    },
    colWidths: [COLUMN_WIDTHS, COLUMN_WIDTHS],
    style: {
      'padding-left': 0,
      'padding-right': 0
    }
  })

  // Create empty row for spacing purposes (symmetric around line between bids and asks)
  bidsTable.push([' ', ' '])

  bids.splice(maxLengthPerSide)
  bids.forEach((bid) => {
    const formattedPrice = formatText(bid.price, FORMAT_TYPES.BID)
    const formattedDepth = formatText(bid.amount, FORMAT_TYPES.DEPTH)
    bidsTable.push([{ hAlign: 'center', content: formattedPrice }, { hAlign: 'center', content: formattedDepth }])
  })

  if (bids.length < maxLengthPerSide) {
    const emptyRecords = maxLengthPerSide - bids.length
    for (let i = 0; i < emptyRecords; i++) {
      bidsTable.push([' ', ' '])
    }
  }

  // Used for creating border between bids / asks
  const gapTable = new Table({
    head: [],
    rowHeights: [1],
    chars: {
      'top': '',
      'top-mid': '',
      'top-left': '',
      'top-right': '',
      // 'bottom': '',
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
      'padding-left': 20
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
      console.clear()
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
 * @param {Integer} windowWidth width
 * @returns {Object} with mainTableWidth and innerTableWidth
 */

function calculateTableWidths (windowWidth) {
  const borderOffset = 4
  const numTables = 2
  const mainTableWidth = Math.round((windowWidth - borderOffset) / numTables)
  const innerTableWidth = Math.round((mainTableWidth - borderOffset) / numTables)

  return { mainTableWidth, innerTableWidth }
}

/**
 * Takes a number formatted as a string and applies coloring so all digits following
 * the last significant digit are grayed out
 * @param {string} text
 * @param {string} type - represents whether to format as a bid, ask, or depth
 * @returns {string}
 */
function formatText (text, type) {
  let lastZeroIndex = -1
  for (let i = 0; i < text.length; i++) {
    const remaining = [...text].slice(i)
    const allZeroesRemaining = remaining.every(char => {
      return char === '0'
    })

    if (allZeroesRemaining) {
      lastZeroIndex = i
      break
    }
  }

  let formatted = ''
  if (lastZeroIndex > -1) {
    for (let i = 0; i < text.length; i++) {
      if (i < lastZeroIndex) {
        switch (type) {
          case FORMAT_TYPES.BID:
            formatted += text.charAt(i).green
            break
          case FORMAT_TYPES.ASK:
            formatted += text.charAt(i).red
            break
          case FORMAT_TYPES.DEPTH:
            formatted += text.charAt(i).white
            break
        }
      } else {
        formatted += text.charAt(i).gray
      }
    }
  } else {
    switch (type) {
      case FORMAT_TYPES.BID:
        formatted = text.green
        break
      case FORMAT_TYPES.ASK:
        formatted = text.red
        break
      case FORMAT_TYPES.DEPTH:
        formatted = text.white
        break
    }
  }

  return formatted
}

module.exports = (program) => {
  program
    .command('orderbook', 'View the order book for a specific market')
    .option('--market <marketName>', MARKET_NAME_HELP_STRING, validations.isMarketName, null, true)
    .option('--rpc-address [rpc-address]', RPC_ADDRESS_HELP_STRING, validations.isHost)
    .action(orderbook)
}
